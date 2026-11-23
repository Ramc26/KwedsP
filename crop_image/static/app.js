(function () {
  const files = [];
  const fileCrops = [];
  const drafts = [];
  let cropper = null;
  let objectUrl = null;
  let currentEditorIndex = -1;
  let dragMode = "crop";
  let spacePan = false;

  const $ = (sel) => document.querySelector(sel);

  const fileInput = $("#fileInput");
  const dropZone = $("#dropZone");
  const fileList = $("#fileList");
  const topStats = $("#topStats");
  const statCount = $("#statCount");
  const draftStat = $("#draftStat");
  const btnBatch = $("#btnBatch");
  const btnSaveDraft = $("#btnSaveDraft");
  const btnDraftZip = $("#btnDraftZip");
  const btnClearDrafts = $("#btnClearDrafts");
  const btnNext = $("#btnNext");
  const draftList = $("#draftList");
  const draftProgress = $("#draftProgress");
  const editorCard = $("#editorCard");
  const emptyState = $("#emptyState");
  const cropImage = $("#cropImage");
  const editorPick = $("#editorPick");
  const busy = $("#busy");
  const toast = $("#toast");

  function formatMb(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 3200);
  }

  function setBusy(on) {
    if (!busy) return;
    busy.hidden = !on;
    busy.classList.toggle("is-active", on);
    busy.setAttribute("aria-busy", on ? "true" : "false");
  }

  setBusy(false);

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function extForFormat(fmt) {
    return { JPEG: ".jpg", WEBP: ".webp", PNG: ".png" }[fmt] || ".jpg";
  }

  function setDragMode(mode) {
    dragMode = mode;
    if (cropper) cropper.setDragMode(mode);
    $("#toolPan").classList.toggle("is-active", mode === "move");
    $("#toolCrop").classList.toggle("is-active", mode === "crop");
  }

  function cropPayloadFromCropper() {
    if (!cropper) return null;
    const d = cropper.getData(true);
    const img = cropper.getImageData();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;
    return {
      px: {
        x: Math.round(d.x),
        y: Math.round(d.y),
        w: Math.round(d.width),
        h: Math.round(d.height),
      },
      norm: {
        x: d.x / nw,
        y: d.y / nh,
        w: d.width / nw,
        h: d.height / nh,
      },
    };
  }

  function saveCurrentCrop() {
    if (currentEditorIndex < 0 || !cropper) return;
    const payload = cropPayloadFromCropper();
    if (payload) fileCrops[currentEditorIndex] = payload;
  }

  function getGlobalCropNorm() {
    const payload = cropPayloadFromCropper();
    return payload ? payload.norm : null;
  }

  function draftCount() {
    return drafts.filter(Boolean).length;
  }

  function updateDraftUi() {
    const n = files.length;
    const d = draftCount();
    draftProgress.textContent = d + " of " + n + " saved to draft";
    draftStat.textContent = d + (d === 1 ? " draft" : " drafts");
    btnDraftZip.disabled = d === 0;
    btnClearDrafts.disabled = d === 0;
    btnSaveDraft.disabled = currentEditorIndex < 0 || !cropper;
    btnNext.disabled = currentEditorIndex < 0 || currentEditorIndex >= files.length - 1;

    draftList.innerHTML = "";
    files.forEach((f, i) => {
      const item = drafts[i];
      const li = document.createElement("li");
      li.className = item ? "is-done" : "";
      const label = item ? item.filename : "— not saved —";
      const size = item ? formatMb(item.sizeBytes) : "";
      li.innerHTML =
        '<button type="button" class="draft-jump" data-i="' +
        i +
        '">' +
        escapeHtml(f.name) +
        "</button>" +
        '<span class="draft-name" title="' +
        escapeHtml(label) +
        '">' +
        escapeHtml(label) +
        "</span>" +
        '<span class="draft-size">' +
        size +
        "</span>";
      draftList.appendChild(li);
    });

    draftList.querySelectorAll(".draft-jump").forEach((btn) => {
      btn.addEventListener("click", () => loadEditor(Number(btn.dataset.i)));
    });

    syncEditorOptions();
  }

  function refreshFileList() {
    fileList.innerHTML = "";
    let total = 0;
    files.forEach((f, i) => {
      total += f.size;
      const li = document.createElement("li");
      const mark = drafts[i] ? "✓ " : "";
      const active = i === currentEditorIndex ? " is-active" : "";
      li.className = active;
      li.innerHTML =
        '<button type="button" class="file-open" data-i="' +
        i +
        '">' +
        mark +
        escapeHtml(f.name) +
        '</button><span class="size">' +
        formatMb(f.size) +
        "</span>";
      fileList.appendChild(li);
    });
    fileList.querySelectorAll(".file-open").forEach((btn) => {
      btn.addEventListener("click", () => loadEditor(Number(btn.dataset.i)));
    });
    const n = files.length;
    btnBatch.disabled = n === 0;
    topStats.hidden = n === 0;
    statCount.textContent = n + (n === 1 ? " file" : " files");
  }

  function refreshAllUi() {
    refreshFileList();
    updateDraftUi();
  }

  function suggestDraftName(index) {
    const f = files[index];
    if (!f) return "";
    if (drafts[index]) return drafts[index].filename;
    const stem = f.name.replace(/\.[^.]+$/, "");
    return stem + "_crop.jpg";
  }

  function syncDraftFieldsForIndex(index) {
    $("#draftName").value = suggestDraftName(index);
    const preset = $("#namePreset");
    preset.value = "";
    const fmt = $("#draftFormat");
    if (drafts[index] && drafts[index].format) {
      fmt.value = drafts[index].format;
    }
  }

  function addFiles(list) {
    const incoming = Array.from(list).filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)
    );
    const start = files.length;
    incoming.forEach((f) => files.push(f));
    for (let i = start; i < files.length; i++) {
      fileCrops[i] = null;
      drafts[i] = null;
    }
    if (incoming.length) {
      refreshAllUi();
      if (currentEditorIndex < 0) loadEditor(0);
      else syncEditorOptions();
    }
  }

  function syncEditorOptions() {
    editorPick.innerHTML = "";
    files.forEach((f, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = (drafts[i] ? "✓ " : "") + f.name;
      editorPick.appendChild(o);
    });
    editorCard.hidden = files.length === 0;
    emptyState.hidden = files.length > 0;
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  function loadEditor(index) {
    saveCurrentCrop();
    const f = files[index];
    if (!f) return;
    currentEditorIndex = index;
    editorPick.value = String(index);
    syncEditorOptions();
    emptyState.hidden = true;
    editorCard.hidden = false;
    syncDraftFieldsForIndex(index);
    refreshFileList();
    destroyCropper();
    objectUrl = URL.createObjectURL(f);
    cropImage.src = objectUrl;
    cropImage.onload = function () {
      const aspect = $("#aspect").value;
      let ar = NaN;
      if (aspect !== "free") {
        const parts = aspect.split(":");
        ar = Number(parts[0]) / Number(parts[1]);
      }
      cropper = new Cropper(cropImage, {
        viewMode: 1,
        aspectRatio: isNaN(ar) ? NaN : ar,
        autoCropArea: 0.92,
        responsive: true,
        background: false,
        zoomable: true,
        zoomOnWheel: true,
        wheelZoomRatio: 0.12,
        movable: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        dragMode: dragMode,
        toggleDragModeOnDblclick: false,
      });
      cropImage.addEventListener("crop", saveCurrentCrop);
      cropImage.addEventListener("cropend", saveCurrentCrop);
      setDragMode(dragMode);
      setTimeout(saveCurrentCrop, 50);

      const saved = fileCrops[index];
      if (saved && saved.px) {
        cropper.setData({
          x: saved.px.x,
          y: saved.px.y,
          width: saved.px.w,
          height: saved.px.h,
        });
      }
      updateDraftUi();
    };
    cropImage.onerror = function () {
      showToast("Could not load this image in the editor");
    };
  }

  async function renderCurrentCrop() {
    const idx = currentEditorIndex;
    const f = files[idx];
    if (!f || !cropper) return null;
    saveCurrentCrop();
    const payload = fileCrops[idx] || cropPayloadFromCropper();
    if (!payload) return null;

    let outName = $("#draftName").value.trim();
    const fmt = $("#draftFormat").value;
    if (!outName) {
      outName = suggestDraftName(idx);
    }
    if (!/\.\w{2,5}$/i.test(outName)) {
      outName += extForFormat(fmt);
    }
    if (outName.toLowerCase().endsWith(".png") && fmt !== "PNG") {
      $("#draftFormat").value = "PNG";
    }

    const fd = new FormData();
    fd.append("file", f, f.name);
    fd.append("unit", "pixels");
    fd.append("x", String(payload.px.x));
    fd.append("y", String(payload.px.y));
    fd.append("w", String(payload.px.w));
    fd.append("h", String(payload.px.h));
    fd.append("max_mb", $("#maxMb").value);
    fd.append("out_format", $("#draftFormat").value);
    fd.append("max_edge", $("#maxEdge").value || "0");
    fd.append("out_name", outName);

    const res = await fetch("/api/crop-one", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Crop failed");
    const blob = await res.blob();
    return {
      blob: blob,
      filename: outName,
      format: $("#draftFormat").value,
      sizeBytes: blob.size,
      mime: blob.type,
    };
  }

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("is-drag");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-drag"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("is-drag");
    addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
    fileInput.value = "";
  });

  $("#maxMb").addEventListener("input", (e) => {
    $("#maxMbOut").textContent = Number(e.target.value).toFixed(1) + " MB";
  });

  editorPick.addEventListener("change", () => {
    loadEditor(Number(editorPick.value));
  });

  $("#aspect").addEventListener("change", () => {
    if (cropper) {
      const aspect = $("#aspect").value;
      if (aspect === "free") cropper.setAspectRatio(NaN);
      else {
        const parts = aspect.split(":");
        cropper.setAspectRatio(Number(parts[0]) / Number(parts[1]));
      }
      setTimeout(saveCurrentCrop, 80);
    }
  });

  $("#namePreset").addEventListener("change", () => {
    const v = $("#namePreset").value;
    if (v) {
      $("#draftName").value = v;
      if (v.toLowerCase().endsWith(".png")) $("#draftFormat").value = "PNG";
      else if (v.toLowerCase().endsWith(".webp")) $("#draftFormat").value = "WEBP";
      else $("#draftFormat").value = "JPEG";
    }
  });

  $("#toolPan").addEventListener("click", () => setDragMode("move"));
  $("#toolCrop").addEventListener("click", () => setDragMode("crop"));
  $("#toolZoomIn").addEventListener("click", () => cropper && cropper.zoom(0.15));
  $("#toolZoomOut").addEventListener("click", () => cropper && cropper.zoom(-0.15));
  $("#toolReset").addEventListener("click", () => cropper && cropper.reset());

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.target.matches("input, textarea, select")) {
      e.preventDefault();
      if (e.type === "keydown" && !spacePan) {
        spacePan = true;
        setDragMode("move");
      }
    }
    if (e.key === "h" || e.key === "H") setDragMode("move");
    if (e.key === "c" || e.key === "C") setDragMode("crop");
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === "Space" && spacePan) {
      spacePan = false;
      setDragMode("crop");
    }
  });

  async function downloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  btnSaveDraft.addEventListener("click", async () => {
    setBusy(true);
    try {
      const result = await renderCurrentCrop();
      if (!result) throw new Error("Nothing to save");
      drafts[currentEditorIndex] = result;
      refreshAllUi();
      showToast("Draft saved · " + result.filename + " · " + formatMb(result.sizeBytes));

      if ($("#autoNext").checked && currentEditorIndex < files.length - 1) {
        loadEditor(currentEditorIndex + 1);
      }
    } catch (err) {
      showToast(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  });

  btnNext.addEventListener("click", () => {
    if (currentEditorIndex < files.length - 1) {
      loadEditor(currentEditorIndex + 1);
    }
  });

  btnDraftZip.addEventListener("click", async () => {
    const zip = new JSZip();
    let count = 0;
    drafts.forEach((d) => {
      if (d && d.blob) {
        zip.file(d.filename, d.blob);
        count++;
      }
    });
    if (!count) {
      showToast("No drafts yet — save each crop first");
      return;
    }
    setBusy(true);
    try {
      const blob = await zip.generateAsync({ type: "blob" });
      await downloadBlob(blob, "wedding_images_drafts.zip");
      showToast("ZIP downloaded · " + count + " files");
    } finally {
      setBusy(false);
    }
  });

  btnClearDrafts.addEventListener("click", () => {
    for (let i = 0; i < drafts.length; i++) drafts[i] = null;
    refreshAllUi();
    showToast("Drafts cleared");
  });

  btnBatch.addEventListener("click", async () => {
    if (!files.length) return;
    saveCurrentCrop();
    setBusy(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f, f.name));
      fd.append("aspect", $("#aspect").value);
      fd.append("max_mb", $("#maxMb").value);
      fd.append("out_format", $("#format").value);
      fd.append("max_edge", $("#maxEdge").value || "0");
      fd.append("as_zip", "true");
      const useEd = $("#useEditorCrop").checked;
      fd.append("use_editor_crop", useEd ? "true" : "false");
      const globalNorm = getGlobalCropNorm();
      if (useEd && globalNorm) {
        fd.append("crop_global", JSON.stringify(globalNorm));
      }
      const perFile = fileCrops.map((c) => (c && c.px ? { px: c.px } : null));
      fd.append("per_file_crops", JSON.stringify(perFile));

      const res = await fetch("/api/process", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      await downloadBlob(blob, "optimized_images.zip");
      showToast("Batch ZIP downloaded");
    } catch (err) {
      showToast(err.message || "Batch failed");
    } finally {
      setBusy(false);
    }
  });

  $("#btnCropDl").addEventListener("click", async () => {
    setBusy(true);
    try {
      const result = await renderCurrentCrop();
      if (!result) throw new Error("Nothing to crop");
      await downloadBlob(result.blob, result.filename);
      showToast("Downloaded · " + formatMb(result.sizeBytes));
    } catch (err) {
      showToast(err.message || "Crop failed");
    } finally {
      setBusy(false);
    }
  });
})();
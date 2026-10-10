/* SPARK viewport adapter: one source of truth for Telegram WebView sizing. */
(function (root) {
  "use strict";

  function measure(width, height, pixelRatio, logicalWidth, logicalHeight) {
    var w = Math.max(1, Number(width) || 1);
    var h = Math.max(1, Number(height) || 1);
    var dpr = Math.max(1, Math.min(Number(pixelRatio) || 1, 2));
    var scale = Math.min(w / logicalWidth, h / logicalHeight);
    return Object.freeze({
      width: w,
      height: h,
      dpr: dpr,
      scale: scale,
      offsetX: (w - logicalWidth * scale) / 2,
      offsetY: (h - logicalHeight * scale) / 2,
      pixelWidth: Math.round(w * dpr),
      pixelHeight: Math.round(h * dpr)
    });
  }

  function resize(canvas, logicalWidth, logicalHeight) {
    var width = root.innerWidth || (root.document && root.document.documentElement.clientWidth) || logicalWidth;
    var height = root.innerHeight || (root.document && root.document.documentElement.clientHeight) || logicalHeight;
    var view = measure(width, height, root.devicePixelRatio || 1, logicalWidth, logicalHeight);
    if (canvas.width !== view.pixelWidth) canvas.width = view.pixelWidth;
    if (canvas.height !== view.pixelHeight) canvas.height = view.pixelHeight;
    return view;
  }

  root.SparkViewport = Object.freeze({ measure: measure, resize: resize });
})(typeof window !== "undefined" ? window : globalThis);

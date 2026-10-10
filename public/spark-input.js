/* SPARK input adapter: keyboard, touch actions, weapon switching and virtual stick. */
(function (root) {
  "use strict";
  var keys = null;
  var cycleWeapon = function () {};
  var stick = null;
  var knob = null;
  var stickPointerId = null;
  var bound = false;

  function stopStick(event) {
    if (stickPointerId === null || (event && event.pointerId !== stickPointerId)) return;
    stickPointerId = null;
    if (keys) { keys.left = false; keys.right = false; }
    if (knob) { knob.style.left = "50%"; knob.style.top = "50%"; }
  }

  function reset() {
    if (keys) Object.keys(keys).forEach(function (key) { keys[key] = false; });
    stopStick();
    if (root.document) root.document.querySelectorAll("[data-act]").forEach(function (button) {
      button.classList.remove("on");
    });
  }

  function moveStick(event) {
    if (!stick || !knob || !keys) return;
    var rect = stick.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = event.clientX - cx;
    var dy = event.clientY - cy;
    var limit = rect.width * 0.31;
    var length = Math.hypot(dx, dy);
    if (length > limit && length > 0) {
      dx = dx / length * limit;
      dy = dy / length * limit;
    }
    knob.style.left = "calc(50% + " + dx + "px)";
    knob.style.top = "calc(50% + " + dy + "px)";
    keys.left = dx < -limit * 0.18;
    keys.right = dx > limit * 0.18;
  }

  function bind(options) {
    if (bound) return;
    options = options || {};
    keys = options.keys;
    cycleWeapon = options.cycleWeapon || cycleWeapon;
    if (!keys || !root.document) throw new Error("SPARK input requires keys and document");
    bound = true;

    var keyMap = {
      left: ["ArrowLeft", "a"], right: ["ArrowRight", "d"],
      jump: ["ArrowUp", "w", " "], attack: ["j", "k"],
      interact: ["e", "Enter"], skill: ["Shift", "l"],
      weaponPrev: ["q", "Q"], weaponNext: ["r", "R"]
    };
    root.addEventListener("keydown", function (event) {
      Object.keys(keyMap).forEach(function (key) {
        if (keyMap[key].indexOf(event.key) < 0) return;
        event.preventDefault();
        if (key === "jump" && !keys.jump) keys.jumpEdge = true;
        if (key === "attack") { keys.attackEdge = true; keys.attack = true; }
        if (key === "interact") keys.interactEdge = true;
        if (key === "skill") keys.skillEdge = true;
        if (key === "weaponPrev") { cycleWeapon(-1); return; }
        if (key === "weaponNext") { cycleWeapon(1); return; }
        keys[key] = true;
      });
    });
    root.addEventListener("keyup", function (event) {
      Object.keys(keyMap).forEach(function (key) {
        if (keyMap[key].indexOf(event.key) < 0) return;
        keys[key] = false;
        if (key === "attack") keys.attack = false;
      });
    });
    root.addEventListener("blur", reset);

    var previous = root.document.getElementById("weaponPrev");
    var next = root.document.getElementById("weaponNext");
    if (previous) previous.addEventListener("click", function (event) {
      event.preventDefault(); event.stopPropagation(); cycleWeapon(-1);
    });
    if (next) next.addEventListener("click", function (event) {
      event.preventDefault(); event.stopPropagation(); cycleWeapon(1);
    });

    root.document.querySelectorAll("[data-act]").forEach(function (button) {
      var action = button.dataset.act;
      function down(event) {
        event.preventDefault();
        try { button.setPointerCapture(event.pointerId); } catch (_) {}
        if (action === "jump" && !keys.jump) keys.jumpEdge = true;
        if (action === "attack") { keys.attackEdge = true; keys.attack = true; }
        if (action === "interact") keys.interactEdge = true;
        if (action === "skill") keys.skillEdge = true;
        keys[action] = true;
        button.classList.add("on");
      }
      function up(event) {
        event.preventDefault();
        keys[action] = false;
        if (action === "attack") keys.attack = false;
        button.classList.remove("on");
      }
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("lostpointercapture", up);
    });

    stick = root.document.getElementById("moveStick");
    knob = root.document.getElementById("stickKnob");
    if (stick && knob) {
      stick.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        stickPointerId = event.pointerId;
        try { stick.setPointerCapture(event.pointerId); } catch (_) {}
        moveStick(event);
      });
      stick.addEventListener("pointermove", function (event) {
        if (event.pointerId === stickPointerId) { event.preventDefault(); moveStick(event); }
      });
      stick.addEventListener("pointerup", stopStick);
      stick.addEventListener("pointercancel", stopStick);
      stick.addEventListener("lostpointercapture", stopStick);
    }
  }

  root.SparkInput = Object.freeze({ bind: bind, reset: reset });
})(typeof window !== "undefined" ? window : globalThis);

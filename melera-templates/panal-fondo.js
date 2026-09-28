/*
 * Fondo de panal y abeja con jarrón para las plantillas del estilo "panal".
 * generate.js lo inserta en cada plantilla panal-*.html, en el lugar del marcador PANAL_JS.
 *
 * Todo es determinístico: el panal sale de una semilla (el id del post), así que el
 * mismo post da siempre la misma imagen y posts distintos, celdas distintas.
 * Geometría, degradés y colores copiados de los diseños aprobados (*.dc.html) y del
 * prototipo de la web (clientes/melera/docs/panal-prototipo.html).
 */
(function () {
  var SQ3 = Math.sqrt(3);

  // mulberry32: el mismo generador que usa la web
  function rng(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hex(cx, cy, r) {
    var p = [];
    for (var k = 0; k < 6; k++) {
      var a = (Math.PI / 3) * k - Math.PI / 2;
      p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return p.join(' ');
  }

  /** SVG del panal (W×H) para una semilla. */
  function panal(W, H, semilla) {
    var seed = Math.abs(parseInt(semilla, 10)) || 7;
    var rnd = rng(seed * 7919 + 13);
    // desfase de la grilla y del "campo" de miel según la semilla
    var ox = rnd() * 107.4, oy = rnd() * 93;
    var fase = seed * 1.618;
    var r = 62, ir = 53.9, w = SQ3 * r, vs = 1.5 * r;
    var celdas = [], brillos = [];
    for (var row = -2; row * vs < H + r * 2; row++) {
      for (var col = -2; col * w < W + w * 2; col++) {
        var cx = col * w + (row & 1 ? w / 2 : 0) - ox, cy = row * vs - oy;
        var n = 0.5 + 0.5 * Math.sin(cx * 0.0055 + fase) * Math.cos(cy * 0.007 - fase * 0.3) + 0.2 * Math.sin((cx - cy) * 0.011 + fase);
        var v = n + (rnd() - 0.5) * 0.45;
        var fill = v > 0.92 ? 'fph' : v > 0.84 ? 'fpc' : 'fpe';
        celdas.push('<polygon points="' + hex(cx, cy, ir) + '" fill="url(#' + fill + ')" stroke="#FFCD82" stroke-opacity="0.12" stroke-width="2.2"/>');
        if (fill === 'fph') {
          var ex = cx - ir * 0.32, ey = cy - ir * 0.38;
          brillos.push('<ellipse cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" rx="11.9" ry="5.4" transform="rotate(-28 ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + ')" fill="#FFFAEB" fill-opacity="0.45"/>');
        }
      }
    }
    // capa de adelante: hexágonos grandes desenfocados (bordes de celdas muy cercanas)
    var R = 211, RW = SQ3 * R, frente = [];
    for (var fr = -1; fr * 1.5 * R < H + R; fr++) {
      for (var fc = -1; fc * RW < W + RW; fc++) {
        if (rnd() > 0.3) continue;
        var fx = fc * RW + (fr & 1 ? RW / 2 : 0) - ox * 2, fy = fr * 1.5 * R - oy * 2;
        frente.push('<polygon points="' + hex(fx, fy, R - 11) + '" fill="none" stroke="#1C0C03" stroke-opacity="0.9" stroke-width="42" stroke-linejoin="round"/>');
      }
    }
    return (
      '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><defs>' +
      '<radialGradient id="fpe" cx="0.58" cy="0.6" r="0.6"><stop offset="0" stop-color="#0E0602"/><stop offset="0.6" stop-color="#241206"/><stop offset="1" stop-color="#3E220B"/></radialGradient>' +
      '<radialGradient id="fph" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#FFE7A8"/><stop offset="0.22" stop-color="#F4B53A"/><stop offset="0.62" stop-color="#C7760B"/><stop offset="1" stop-color="#6E3605"/></radialGradient>' +
      '<radialGradient id="fpc" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#F8E6BC"/><stop offset="0.55" stop-color="#E0BC7A"/><stop offset="1" stop-color="#A0733A"/></radialGradient>' +
      '<radialGradient id="fpl" cx="0.72" cy="0.3" r="0.7"><stop offset="0" stop-color="#FFAA3C" stop-opacity="0.42"/><stop offset="0.5" stop-color="#FF8C1E" stop-opacity="0.12"/><stop offset="1" stop-color="#FF8C1E" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="fpv" cx="0.5" cy="0.47" r="0.72"><stop offset="0.35" stop-color="#0A0401" stop-opacity="0"/><stop offset="1" stop-color="#0A0401" stop-opacity="0.82"/></radialGradient>' +
      '<filter id="fpb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>' +
      '</defs><rect width="' + W + '" height="' + H + '" fill="#4E2D10"/>' +
      celdas.join('') + brillos.join('') +
      '<g filter="url(#fpb)" opacity="0.7">' + frente.join('') + '</g>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#fpl)" style="mix-blend-mode:screen"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#fpv)"/></svg>'
    );
  }

  function gota(x, y, s, opacidad) {
    var t = (s * 2.4).toFixed(1), c = (s * 1.05).toFixed(1), q = (s * 0.5).toFixed(1), b = (s * 0.1).toFixed(1);
    return '<path transform="translate(' + x + ' ' + y + ')" d="M0,-' + t + ' Q' + c + ',-' + q + ' ' + s + ',' + b + ' A' + s + ' ' + s + ' 0 0 1 -' + s + ',' + b + ' Q-' + c + ',-' + q + ' 0,-' + t + ' Z" fill="url(#fpbd)" opacity="' + opacidad + '"/>';
  }

  /**
   * Abeja con jarrón (ilustración fija) y rastro de gotas.
   * x, y: posición de la abeja; escala; mirando: 1 = hacia la derecha, -1 = hacia la izquierda;
   * gotas: [[x, y], ...] de la más cercana al jarrón a la más lejana.
   */
  function abeja(o) {
    var s = o.escala || 3.2, m = o.mirando || -1, rot = o.rot || -8;
    var gotas = (o.gotas || []).map(function (g, i, arr) {
      return gota(g[0], g[1], (9 - i * 1).toFixed(1), (0.95 - (i / Math.max(1, arr.length - 1)) * 0.55).toFixed(2));
    }).join('');
    return (
      '<svg width="100%" height="100%" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true"><defs>' +
      '<radialGradient id="fpbd" cx="0.35" cy="0.6" r="0.8"><stop offset="0" stop-color="#FFE0A0"/><stop offset="0.45" stop-color="#E89A16"/><stop offset="1" stop-color="#A95A06"/></radialGradient>' +
      '<linearGradient id="fpbbd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD066"/><stop offset="0.5" stop-color="#E9A21C"/><stop offset="1" stop-color="#C47A0A"/></linearGradient>' +
      '<linearGradient id="fpbjr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7C35A"/><stop offset="1" stop-color="#B8650A"/></linearGradient>' +
      '<clipPath id="fpbcl"><polygon points="-15,0 -9,-8 7,-8 12,0 7,8 -9,8"/></clipPath></defs>' +
      gotas +
      '<g transform="translate(' + o.x + ' ' + o.y + ') rotate(' + rot + ') scale(' + (m * s) + ' ' + s + ')" stroke-linejoin="round" stroke-linecap="round">' +
      '<g transform="translate(-4 -6) scale(1 0.8)"><polygon points="0,0 -7,-11 -1,-19 8,-16 9,-5" fill="#FFF6E2" fill-opacity="0.35" stroke="#FFECC8" stroke-width="1"/></g>' +
      '<g transform="translate(1 8) rotate(-6)"><path d="M-3,0 L-6,11 M4,0 L6,11" stroke="#2A1405" stroke-width="1.1" fill="none"/>' +
      '<rect x="-7" y="11" width="14" height="3.5" fill="#6B3A12"/>' +
      '<rect x="-8" y="14" width="16" height="15" rx="4" fill="url(#fpbjr)" stroke="#FFEECD" stroke-opacity="0.75" stroke-width="1.1"/>' +
      '<rect x="-8" y="18.5" width="16" height="4.5" fill="#F4E4C1"/><rect x="-6" y="24" width="1.6" height="4" fill="#FFFFFF" fill-opacity="0.4"/>' +
      '<path d="M6.2,14.5 Q8.4,17 7.6,19.5" stroke="#E9A21C" stroke-width="2" fill="none"/></g>' +
      '<polygon points="-15,0 -9,-8 7,-8 12,0 7,8 -9,8" fill="url(#fpbbd)"/>' +
      '<g clip-path="url(#fpbcl)"><rect x="-7" y="-9" width="4" height="18" fill="#2A1405"/><rect x="0" y="-9" width="4" height="18" fill="#2A1405"/></g>' +
      '<polygon points="-15,0 -9,-8 7,-8 12,0 7,8 -9,8" fill="none" stroke="#2A1405" stroke-width="1.4"/>' +
      '<polygon points="-15,-1.5 -19.5,0.5 -15,2" fill="#2A1405"/><circle cx="15" cy="-1" r="6" fill="#2A1405"/>' +
      '<circle cx="17.2" cy="-2.8" r="1.5" fill="#F4E4C1"/>' +
      '<path d="M16,-6 Q19,-12 23,-13 M14,-6.5 Q15,-13 18,-15.5" stroke="#2A1405" stroke-width="1.2" fill="none"/>' +
      '<circle cx="23" cy="-13" r="1.3" fill="#2A1405"/><circle cx="18" cy="-15.5" r="1.3" fill="#2A1405"/>' +
      '<g transform="translate(1 -6)"><polygon points="0,0 -7,-11 -1,-19 8,-16 9,-5" fill="#FFF6E2" fill-opacity="0.55" stroke="#FFECC8" stroke-width="1"/><path d="M0,0 L1,-15" stroke="#FFECC8" stroke-opacity="0.5" fill="none"/></g>' +
      '</g></svg>'
    );
  }

  window.MeleraPanal = { panal: panal, abeja: abeja };
})();

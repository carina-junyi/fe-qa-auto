(function(){
  var ha = document.querySelector('.hints-area');
  if (!ha) return JSON.stringify({error: 'no .hints-area'});
  var children = ha.children;
  var hints = [];
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var fc = child.firstElementChild;
    var label = null;
    if (fc) { var t = fc.textContent.trim(); if (t.match(/^\d+\/\d+$/)) label = t; }
    function parseMathML(mathEl) {
      if (!mathEl) return '';
      var children = mathEl.children; var p = [];
      for (var k = 0; k < children.length; k++) {
        var el = children[k], tag = el.tagName.toLowerCase();
        if (tag === 'mn' || tag === 'mi' || tag === 'mo') { p.push(el.textContent.trim()); }
        else if (tag === 'mfrac') {
          var num = el.children[0] ? (parseMathML(el.children[0]) || el.children[0].textContent.trim()) : '?';
          var den = el.children[1] ? (parseMathML(el.children[1]) || el.children[1].textContent.trim()) : '?';
          p.push('(' + num + '/' + den + ')');
        } else if (tag === 'msup') {
          var base = el.children[0] ? (parseMathML(el.children[0]) || el.children[0].textContent.trim()) : '?';
          var exp = el.children[1] ? el.children[1].textContent.trim() : '?';
          p.push(base + '^' + exp);
        } else if (tag === 'mrow' || tag === 'mstyle') { p.push(parseMathML(el)); }
        else { p.push(el.textContent.trim()); }
      }
      return p.join('');
    }
    function ex(node) {
      var parts = [];
      for (var j = 0; j < node.childNodes.length; j++) {
        var cn = node.childNodes[j];
        if (cn.nodeType === 3) { var t = cn.textContent.trim(); if (t) parts.push(t); }
        else if (cn.nodeType === 1) {
          if (cn.tagName === 'MJX-CONTAINER') {
            var m = cn.querySelector('math');
            if (m) parts.push('[math:' + parseMathML(m) + ']');
          } else parts.push.apply(parts, ex(cn));
        }
      }
      return parts;
    }
    if (label) hints.push({step: label, text: ex(child).join(' ')});
  }
  return JSON.stringify({totalSteps: hints.length, hints: hints});
})()

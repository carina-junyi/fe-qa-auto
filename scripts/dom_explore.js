(function(){
  var ids = [];
  document.querySelectorAll('[id]').forEach(function(el){
    ids.push({id: el.id, tag: el.tagName, cls: (el.className||'').toString().substring(0,80)});
  });
  var perseusClasses = new Set();
  document.querySelectorAll('[class]').forEach(function(el){
    el.className.toString().split(' ').forEach(function(c){
      if (c.match(/perseus|exercise|hint|question|answer|choice|widget|input|select|drag|drop|sort|match/i)) perseusClasses.add(c);
    });
  });
  var interactiveEls = [];
  document.querySelectorAll('[role]').forEach(function(el){
    var rect = el.getBoundingClientRect();
    interactiveEls.push({
      role: el.getAttribute('role'),
      tag: el.tagName,
      cls: (el.className||'').toString().substring(0,80),
      text: el.textContent.trim().substring(0,100),
      x: Math.round(rect.x), y: Math.round(rect.y),
      w: Math.round(rect.width), h: Math.round(rect.height)
    });
  });
  return JSON.stringify({ids: ids, perseusClasses: Array.from(perseusClasses), interactiveEls: interactiveEls});
})()
(function(){
  var links = document.querySelectorAll('a[href*="/exercises/"]');
  var exercises = [];
  links.forEach(function(a){
    var href = a.href;
    var text = a.textContent.trim().substring(0, 100);
    if (exercises.findIndex(function(e){ return e.href === href; }) === -1) {
      exercises.push({href: href, text: text});
    }
  });
  return JSON.stringify({count: exercises.length, exercises: exercises});
})()
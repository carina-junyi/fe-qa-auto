(function () {
  // Mute all existing audio/video elements
  document.querySelectorAll('audio, video').forEach(function (el) {
    el.muted = true;
    el.volume = 0;
  });

  // Override Audio constructor to mute future instances
  var OriginalAudio = window.Audio;
  window.Audio = function () {
    var audio = new OriginalAudio(...arguments);
    audio.muted = true;
    audio.volume = 0;
    return audio;
  };
  window.Audio.prototype = OriginalAudio.prototype;

  // Observe DOM for dynamically added audio/video elements
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
          node.muted = true;
          node.volume = 0;
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return 'audio muted';
})()

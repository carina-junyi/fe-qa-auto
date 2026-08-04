(function(){
  var workarea = document.getElementById('workarea');
  var mq = workarea ? workarea.querySelector('.mq-editable-field.mq-math-mode') : null;
  if (!mq) return JSON.stringify({error: 'no MathQuill field in workarea'});

  var result = {
    autoCommands: null,
    autoOperatorNames: null,
    availableSymbols: [],
    hasKeypad: false,
    keypadSymbols: [],
    mqConfigError: null
  };

  // Check MathQuill autoCommands config
  try {
    var MQ = MathQuill.getInterface(2);
    var field = MQ.MathField(mq);
    if (field && field.__controller && field.__controller.options) {
      var opts = field.__controller.options;
      result.autoCommands = opts.autoCommands || '';
      result.autoOperatorNames = opts.autoOperatorNames || '';
      if (result.autoCommands) {
        result.availableSymbols = result.autoCommands.split(' ').filter(Boolean);
      }
    }
  } catch(e) {
    result.mqConfigError = e.message;
  }

  // Check for virtual keypad buttons
  var keypadEl = document.querySelector(
    '[class*="keypad"], [class*="Keypad"], [class*="toolbar"], [class*="math-key"]'
  );
  if (keypadEl) {
    result.hasKeypad = true;
    var buttons = keypadEl.querySelectorAll('button, [role="button"]');
    result.keypadSymbols = Array.from(buttons).map(function(btn) {
      return btn.getAttribute('aria-label') || btn.textContent.trim();
    }).filter(Boolean);
  }

  // Convenience flags for common symbols
  result.sqrtAvailable = (
    result.availableSymbols.indexOf('sqrt') !== -1 ||
    result.keypadSymbols.some(function(s){ return s.indexOf('√') !== -1 || s.toLowerCase().indexOf('sqrt') !== -1; })
  );
  result.piAvailable = (
    result.availableSymbols.indexOf('pi') !== -1 ||
    result.keypadSymbols.some(function(s){ return s.indexOf('π') !== -1 || s.toLowerCase().indexOf('pi') !== -1; })
  );

  return JSON.stringify(result);
})()

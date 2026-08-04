(function(){
  // Check for login overlay blocking the exercise page
  var loginOverlay = document.querySelector('.login-overlay');
  var loginOverlayVisible = !!(loginOverlay && loginOverlay.offsetParent !== null);

  // Check if current URL is a login/signup page
  var onLoginPage = /\/(login|signin|signup|register)/.test(window.location.pathname);

  // Check for logged-in indicators (user avatar in navbar)
  var userIndicator = document.querySelector(
    '[class*="user-avatar"], [class*="UserAvatar"], [class*="profile-photo"], .navbar-user, [data-testid*="user-menu"]'
  );

  return JSON.stringify({
    needsLogin: loginOverlayVisible || onLoginPage,
    loginOverlayVisible: loginOverlayVisible,
    onLoginPage: onLoginPage,
    isLoggedIn: !!userIndicator,
    currentUrl: window.location.href
  });
})()

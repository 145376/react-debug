// Track the paint time of the shell
requestAnimationFrame(function () {
  // eslint-disable-next-line dot-notation
  window['$RT'] = performance.now();
});
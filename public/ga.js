window.addEventListener('load', function() {
  var s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-VSFF1NL2ED';
  s.async = true;
  document.head.appendChild(s);
  s.onload = function() {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-VSFF1NL2ED');
  };
});

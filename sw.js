self.addEventListener('fetch', function(event) {
  // Aquí puedes añadir lógica para guardar archivos en la memoria
  // para que funcionen sin internet. Para esta app, lo dejamos simple.
});

// Este código registra el service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => console.log('Service Worker registrado:', registration))
    .catch(error => console.log('Registro de Service Worker fallido:', error));
}
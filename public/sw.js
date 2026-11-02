// Shows push notifications from the portal (AI alerts and new drafts) and opens the right page when tapped.
self.addEventListener('push', event => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch (e) { d = { title: 'Notification', body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.title || 'Notification', {
    body: d.body || '', icon: '/logo-192.png', badge: '/logo-192.png', data: { url: d.url || '/' },
  }))
})
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus() } }
    return self.clients.openWindow(url)
  }))
})

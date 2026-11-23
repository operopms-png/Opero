# NOVOURQ WhatsApp bridge

Holds one linked WhatsApp number and mirrors it to the portal. One bridge per company.

Use a spare number. This is not an official WhatsApp product, so WhatsApp can restrict a linked number.
It needs an always-on host with a persistent disk. It cannot run on Netlify.

## Set up (Railway or Fly)

1. In the portal open Staff Centre, Human Intelligence Hub, Clients and sales, WhatsApp, and press Set up WhatsApp.
2. Deploy this folder (`whatsapp-bridge`) using the Dockerfile. Mount a persistent volume at `/data`.
3. Set these environment variables on the host:
   - `BRIDGE_SECRET` the code shown in the portal
   - `PORTAL_URL` the portal address shown, for example https://app.thenovourq.com
4. Give the service a public https address, paste it into the portal page and press Save.
5. Scan the QR code with the spare phone: WhatsApp, Settings, Linked devices, Link a device.

## What it does

- Posts every private message, in and out, to `PORTAL_URL/api/whatsapp-mirror/inbound` (groups and status updates are ignored).
- `POST /send` sends one message at a time with a 3 to 7 second pause between, so the number behaves like a person.
- `GET /status` returns the link state and the QR code. `POST /logout` unlinks.
- Every request needs `Authorization: Bearer <BRIDGE_SECRET>`.

insert into system_messages (title, body, type, published, created_at)
values (
  'Tenant Portal: six new sections added',
  'The Property Management tenant portal now includes Documents, Messages, Announcements, Renewal/Move-out requests, Community/Amenities info, and Profile settings — alongside the existing Lease, Payments, and Maintenance tabs. Tenants can now message their property manager directly, view shared documents, request a lease renewal or give move-out notice, see building amenities (WiFi, bin collection, parking, house rules), and update their own contact and emergency details. To populate the new tabs for a tenant, add rows to pm_documents and set the new wifi_ssid / bin_collection_notes / parking_notes / house_rules_url fields on the relevant pm_properties row.',
  'feature',
  true,
  now()
);

/*
 * Copy this file to js/supabase-config.js and fill in the two values below.
 * Both values are PUBLIC by design (they ship to every visitor's browser).
 * NEVER put the service_role key or any secret here. Security comes from RLS, not from hiding these.
 *   supabaseUrl : Project Settings -> API -> Project URL         e.g. https://wojbknbzgpmxtftfwsls.supabase.co
 *   supabaseKey : Project Settings -> API -> anon / publishable key
 */
window.CMS_CONFIG = {
  supabaseUrl: 'https://wojbknbzgpmxtftfwsls.supabase.co',
  supabaseKey: 'sb_publishable_xKBOLeu70ySoxo-vPIpsuQ__c5UkZWs',
  imagesBucket: 'site-media',
  videosBucket: 'site-videos',
  requestTimeoutMs: 4000,   // public site: after this the original HTML simply stays as it is
  maxImageMB: 5,            // admin upload limit (must be <= bucket limit in supabase/03_storage.sql)
  maxVideoMB: 25
};

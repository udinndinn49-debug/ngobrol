// supabase-client.js

const SUPABASE_URL = 'https://zisateevmyushnucnwfs.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_-exfRTTm2rD080T-jwesIQ_YaOVKiJp'; 

// Membuat koneksi ke Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Mengekspos koneksi ini agar bisa digunakan oleh script.js
window.supabaseClient = supabase;

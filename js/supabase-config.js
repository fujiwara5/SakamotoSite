// js/supabase-config.js

// ステップ1-4で取得した自分のプロジェクトのURLとAPIキーに書き換える
const SUPABASE_URL = 'https://ujdpwwhyftxwziebldxf.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZHB3d2h5ZnR4d3ppZWJsZHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MjI0NjAsImV4cCI6MjA2NTI5ODQ2MH0.WBYiiCYi08IHkIjdoGpEejT6v_XogG9T6tVQDJ6XgJc';

// main.jsで使えるように変数をエクスポートする
export { SUPABASE_URL, SUPABASE_ANON_KEY };
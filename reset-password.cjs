const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://qgxphqkkpohzwolnzdpu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneHBocWtrcG9oendvbG56ZHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTA4NDEsImV4cCI6MjEwMTQ4Njg0MX0.sXUFXWr77YUcUQ0zkRZe2e9j3rkPHMfmhSjVcQX3AJE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
  const email = 'shashikaisuranga1028@gmail.com';
  const newPassword = 'password123';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);

  const { data, error } = await supabase
    .from('users')
    .update({ password: hash })
    .eq('email', email)
    .select();

  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log('Password reset successfully for', email);
    console.log('New password:', newPassword);
  }
}

resetPassword();

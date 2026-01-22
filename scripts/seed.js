
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUser() {
    const email = 'innocentmustapha@stockmaster.local';
    const password = 'ak47don2';
    const fullName = 'Innocent Mustapha';
    const username = 'INNOCENT MUSTAPHA';

    console.log(`Creating user: '${email}' (length: ${email.length})...`);
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    console.log(`Key length: ${supabaseKey.length}, Starts with: ${supabaseKey.substring(0, 5)}...`);

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        console.error('Error creating user:', error.message);
        return;
    }

    if (data.user) {
        console.log('User created successfully:', data.user.id);

        if (data.session) {
            console.log('Session active, creating profile...');
            // We can query as the user
            const userClient = createClient(supabaseUrl, supabaseKey, {
                global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
            });

            const { error: profileError } = await userClient.from('profiles').insert([{
                id: data.user.id,
                name: fullName,
                username: username,
                role: 'SUPER_ADMIN',
                subscription: 'PREMIUM',
                trial_started_at: new Date().toISOString()
            }]);

            if (profileError) {
                console.error('Error creating profile:', profileError.message);
            } else {
                console.log('Profile created successfully as SUPER_ADMIN.');
            }
        } else {
            console.log('User created but email confirmation required or no session returned. Profile not created by script.');
            console.log('IMPORTANT: You must manually confirm the email or disable email confirmation in Supabase to log in.');
        }
    }
}

seedUser();

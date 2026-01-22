
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const getLocalDateString = (dateStr) => {
    if (!dateStr) return 'missing';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

async function debug() {
    const { data: sales, error } = await supabase.from('sales').select('*').limit(50);
    if (error) return console.error(error);

    const todayStr = getLocalDateString(new Date().toISOString());
    console.log('Current Date (Local Search String):', todayStr);
    console.log('--------------------------------------------------');

    let todaysCount = 0;
    let allCount = sales.length;

    sales.forEach(s => {
        const sDate = getLocalDateString(s.timestamp);
        const isToday = sDate === todayStr;
        if (isToday) todaysCount++;
        console.log(`ID: ${s.id.slice(0, 8)} | TS: ${s.timestamp} | Rev: ${s.total_price} | Prof: ${s.profit} | Cost: ${s.total_cost} | IsToday: ${isToday}`);
    });

    console.log('--------------------------------------------------');
    console.log(`Total Sales checked: ${allCount}`);
    console.log(`Today's Sales found: ${todaysCount}`);
}

debug();

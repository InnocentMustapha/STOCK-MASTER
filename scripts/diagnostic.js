
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function diagnostic() {
    const { data: sales, error } = await supabase.from('sales').select('*');
    if (error) return console.error(error);

    console.log(`Total Sales in Table: ${sales.length}`);

    const allTimeRev = sales.reduce((acc, s) => acc + s.total_price, 0);
    const allTimeProf = sales.reduce((acc, s) => acc + s.profit, 0);

    console.log(`All-Time Total Revenue: ${allTimeRev}`);
    console.log(`All-Time Total Profit: ${allTimeProf}`);

    const getLocalDateString = (dateStr) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const todayStr = getLocalDateString(new Date().toISOString());
    console.log(`Today's Date String: ${todayStr}`);

    const todaySales = sales.filter(s => getLocalDateString(s.timestamp) === todayStr);
    console.log(`Today's Sales Count: ${todaySales.length}`);

    const todayRev = todaySales.reduce((acc, s) => acc + s.total_price, 0);
    const todayProf = todaySales.reduce((acc, s) => acc + s.profit, 0);

    console.log(`Today's Revenue (Calculated): ${todayRev}`);
    console.log(`Today's Profit (Calculated): ${todayProf}`);
}

diagnostic();

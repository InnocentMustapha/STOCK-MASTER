
// Helper to get consistent local date string YYYY-MM-DD
export const getLocalDateISO = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

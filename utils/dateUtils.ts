
// Helper to get consistent local date string YYYY-MM-DD
export const getLocalDateISO = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const getStartOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const newDate = new Date(date.setDate(diff));
    const offset = newDate.getTimezoneOffset() * 60000;
    return new Date(newDate.getTime() - offset).toISOString().split('T')[0];
};

export const getEndOfWeek = (dateString: string) => {
    const startOfWeek = new Date(getStartOfWeek(dateString));
    startOfWeek.setDate(startOfWeek.getDate() + 6);
    const offset = startOfWeek.getTimezoneOffset() * 60000;
    return new Date(startOfWeek.getTime() - offset).toISOString().split('T')[0];
};

export const getStartOfMonth = (dateString: string) => {
    const date = new Date(dateString);
    const newDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = newDate.getTimezoneOffset() * 60000;
    return new Date(newDate.getTime() - offset).toISOString().split('T')[0];
};

export const getEndOfMonth = (dateString: string) => {
    const date = new Date(dateString);
    const newDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const offset = newDate.getTimezoneOffset() * 60000;
    return new Date(newDate.getTime() - offset).toISOString().split('T')[0];
};

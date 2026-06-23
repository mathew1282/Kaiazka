// ======================
// SUPABASE CONFIG
// ======================
const SUPABASE_URL = 'https://ytitgnljigizsunidwdy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0aXRnbmxqaWdpenN1bmlkd2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjc5MTMsImV4cCI6MjA5Nzc0MzkxM30.rs3aHmDiDyAhjpIxbSsD4JLyv4tQMMOIcm8R2uZnM6M';

let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// ======================
// DEFAULT STATE
// ======================
const defaultState = {
    dane: {
        columns: [
            "Imię",
            "Nazwisko",
            "Stopień",
            "Numer służbowy",
            "Telefon"
        ],
        rows: []
    },
    zgloszenia: {
        columns: ["Linia", "Opis"],
        rows: []
    },
    polecenia: {
        columns: ["Linia", "Opis"],
        rows: []
    },
    patrole: [],
    szablony: [],
    // Pola zapamiętywane na stałe
    kz: "",
    mkk: ""
};

let appState = { ...defaultState };

// ======================
// FUNKCJE ZAPISU / ODCZYTU
// ======================

async function saveState() {
    // Zawsze zapisujemy lokalnie jako backup
    localStorage.setItem("sokData", JSON.stringify(appState));

    const client = getSupabase();
    try {
        const { error } = await client
            .from('app_state')
            .upsert({
                id: 1,
                name: 'main_state',
                data: appState,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) throw error;
        console.log("✅ Dane zapisane na serwerze (Supabase)");
        return true;
    } catch (err) {
        console.warn("❌ Nie udało się zapisać na serwerze (używam localStorage)", err);
        return false;
    }
}

async function loadState() {
    const client = getSupabase();
    
    try {
        const { data, error } = await client
            .from('app_state')
            .select('data')
            .eq('id', 1)
            .single();

        if (data?.data) {
            appState = { ...defaultState, ...data.data };
            console.log("✅ Dane wczytane z Supabase");
        } else {
            // Jeśli nie ma danych na serwerze - ładujemy z localStorage
            const localData = localStorage.getItem("sokData");
            if (localData) {
                appState = { ...defaultState, ...JSON.parse(localData) };
                console.log("✅ Dane wczytane z localStorage");
            }
        }
    } catch (err) {
        console.warn("Nie udało się połączyć z serwerem, ładuję localStorage");
        const localData = localStorage.getItem("sokData");
        if (localData) appState = { ...defaultState, ...JSON.parse(localData) };
    }

    // Zapisz ponownie na serwer (synchronizacja)
    saveState();
    return appState;
}

// ======================
// UPLOAD PDF
// ======================

async function uploadPDF(file, customName = null) {
    if (!file) return null;

    const client = getSupabase();
    const fileName = customName || `sok_wpis_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.pdf`;

    try {
        const { error: uploadError } = await client.storage
            .from('pdfy')
            .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = client.storage
            .from('pdfy')
            .getPublicUrl(fileName);

        console.log("✅ PDF zapisany:", urlData.publicUrl);
        return urlData.publicUrl;
    } catch (err) {
        console.error("Błąd uploadu PDF:", err);
        alert("Nie udało się zapisać PDF na serwerze.");
        return null;
    }
}

// ======================
// INICJALIZACJA
// ======================

window.saveState = saveState;
window.loadState = loadState;
window.uploadPDF = uploadPDF;

// Automatyczne wczytanie danych przy starcie aplikacji
document.addEventListener("DOMContentLoaded", async () => {
    await loadState();
});

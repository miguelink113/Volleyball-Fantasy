// lib/scraper/esvoley-groups.ts

// Mapping from RFEVB competition IDs to verified esvoley group IDs.
export const ESVOLEY_GROUPS = {
    // Superliga Masculina
    166: {
        name: "Superliga Masculina",
        groups: [{ id: 206, name: "Liga Regular" }]
    },
    // Superliga 2 Masculina
    167: {
        name: "Superliga 2 Masculina",
        groups: [
            { id: 85, name: "Grupo A" },
            { id: 86, name: "Grupo B" },
            { id: 87, name: "Grupo C" },
        ]
    },
    // Liga Iberdrola
    165: {
        name: "Liga Iberdrola",
        groups: [{ id: 213, name: "Liga Regular" }]
    },
    // Superliga Femenina 2 (Según tus capturas)
    164: {
        name: "Superliga Femenina 2",
        groups: [
            { id: 224, name: "Grupo A" },
            { id: 225, name: "Grupo B" },
            { id: 226, name: "Grupo C" },
        ]
    },
};
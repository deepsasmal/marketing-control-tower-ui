export function inferQueryFields(data: any[]): { dimensions: string[], measures: string[] } {
    if (!data || data.length === 0) return { dimensions: [], measures: [] };
    const keys = Object.keys(data[0]);
    const dimensions: string[] = [];
    const measures: string[] = [];

    for (const key of keys) {
        let isNumeric = true;
        let allNull = true;
        for (const row of data) {
            const val = row[key];
            if (val !== null && val !== undefined) {
                allNull = false;
                if (isNaN(Number(val)) || typeof val === 'boolean' || val === '') {
                    isNumeric = false;
                    break;
                }
            }
        }
        // If all values are null, default to dimension unless it's the only key
        if (allNull) {
            if (keys.length === 1) measures.push(key);
            else dimensions.push(key);
        } else if (isNumeric) {
            measures.push(key);
        } else {
            dimensions.push(key);
        }
    }

    // Fallback for KPI (only 1 dimension found, should be measure)
    if (keys.length === 1 && dimensions.length === 1 && measures.length === 0) {
        measures.push(dimensions.pop()!);
    }
    // Fallback for multiple measures but no dimensions (assume first is a dimension like an ID)
    if (dimensions.length === 0 && measures.length > 1) {
        dimensions.push(measures.shift()!);
    }

    return { dimensions, measures };
}

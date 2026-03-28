import { useState, useEffect, useMemo } from 'react';
import { CardWithData } from '../types/api';
import { inferQueryFields } from '../lib/utils';
import { fetchAnalyticsQuery } from '../api';

export function useChartData(card: CardWithData, globalFilters: any[], token: string) {
    const [activeDimension, setActiveDimension] = useState<string>('');
    const [data, setData] = useState(card.data);
    const [loading, setLoading] = useState(false);

    const baseQuery = card.cube_query || { ...inferQueryFields(card.data), filters: [] };
    const initialDim = baseQuery.dimensions?.[0] || '';

    // Only apply filters whose member prefix matches this card's cube.
    // Prevents cross-cube member contamination (would cause a 502 from the API).
    const cubePrefix = baseQuery.measures?.[0]?.split('.')[0] ?? '';
    const cubeFilters = useMemo(
        () => globalFilters.filter(f => !cubePrefix || f.member?.startsWith(`${cubePrefix}.`)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(globalFilters), cubePrefix],
    );

    useEffect(() => {
        let isMounted = true;
        const dimToFetch = activeDimension || initialDim;

        // Use cached server-side data when nothing has changed
        if ((!activeDimension || activeDimension === initialDim) && cubeFilters.length === 0) {
            if (isMounted) {
                setData(card.data);
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        fetchAnalyticsQuery({
            ...baseQuery,
            dimensions: dimToFetch ? [dimToFetch] : [],
            filters: [...(baseQuery.filters || []), ...cubeFilters],
            limit: 50,
        }, token)
            .then(res => {
                if (isMounted) {
                    setData(Array.isArray(res) ? res : res.data ?? res);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error('Failed to fetch custom chart data:', err);
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [activeDimension, cubeFilters, card, token]);

    return {
        activeDimension: activeDimension || initialDim,
        setActiveDimension,
        data,
        loading,
        currentMeasures: baseQuery.measures,
    };
}

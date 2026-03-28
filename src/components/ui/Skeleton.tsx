import React from 'react';

export const Skeleton = ({
    className,
    style,
    width,
    height,
    borderRadius = 6,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & {
    width?: number | string;
    height?: number | string;
    borderRadius?: number | string;
}) => {
    return (
        <div
            className={`skeleton-shimmer ${className || ''}`}
            style={{
                width: width || '100%',
                height: height || '100%',
                borderRadius,
                flexShrink: 0,
                ...style,
            }}
            {...props}
        />
    );
};

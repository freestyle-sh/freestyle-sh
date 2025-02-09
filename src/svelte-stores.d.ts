import { Readable } from "svelte/store";

export function createCloudQuery<
    T extends (...args: any[]) => Promise<any>,
>(
    queryFn: T,
): {
    data: Readable<Awaited<ReturnType<T>>>;
    error: Readable<Error | undefined>;
    loading: Readable<boolean>;
    promise: Readable<Promise<Awaited<ReturnType<T>>> | undefined>;
    revalidate: (...args: Parameters<T>) => void;
};

export function createCloudMutation<
    T extends (...args: any[]) => Promise<any>,
>(
    mutationFn: T,
): {
    loading: Readable<boolean>;
    error: Readable<any>;
    mutate: T;
};

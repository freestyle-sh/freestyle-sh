export function useCloudQuery<
    T extends (...args: any[]) => Promise<any>,
>(
    queryFn: T,
): {
    data: Awaited<ReturnType<T>>;
    mutate: (data: Awaited<ReturnType<T>>) => void;
    loading: boolean;
    error: any;
    promise: Promise<Awaited<ReturnType<T>>>;
};

export function useCloudMutation<
    T extends (...args: any[]) => Promise<any>,
>(
    mutationFn: T,
): {
    mutate: T;
    loading: boolean;
    error: any;
    promise: Promise<Awaited<ReturnType<T>>>;
};

export declare class CloudstateInspection {
    static id: "cloudstate-inspection";
    getStaticClasses(): {
        id: string;
        name: string;
        methods: {
            name: string;
        }[];
    }[];
    getInstances(): Promise<
        (Record<string, unknown> & {
            id: string;
            constructor: string;
        })[]
    >;
    isStaticClass(id: string): boolean;
    getInstanceGroups(): Promise<
        {
            constructor: string;
            id?: string | undefined;
            length: number;
        }[]
    >;
}

export type CloudState<T> = {
    [

    K in keyof T as T[K] extends (...args: any[]) => any ? K
    : never

    ]: T[K] extends (...args: any[]) => any ? (
        ...args: CloudstateParameters<Parameters<T[K]>>
    ) => CloudstatePromise<Awaited<ReturnType<T[K]>>>
    : never;
};

declare class CloudstatePromise<T> extends Promise<T> {
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?:
            | ((
                value: T,
                context: { invalidatedMethods: { instance: string; method: string }[] },
            ) => TResult1 | PromiseLike<TResult1>)
            | null
            | undefined,
        onrejected?:
            | ((
                reason: any,
                context: { invalidatedMethods: string[] },
            ) => TResult2 | PromiseLike<TResult2>)
            | null
            | undefined,
    );
}

export type CloudstateParameters<T> = {
    [P in keyof T]: T[P] extends PlainObject ? CloudstateParameters<T[P]>
    : CloudState<T[P]>;
};

export type Primitive =
    | bigint
    | boolean
    | null
    | number
    | string
    | symbol
    | undefined

    | any[];

export interface PlainObject {
    [key: string]: Primitive | PlainObject;
}

export type FreestyleOptions = {
    createHeaders?: () => Promise<Headers> | Headers;
    baseUrl?: string;
    fetch?: typeof fetch;
};

export declare function configureFreestyle(options?: FreestyleOptions): void;

export declare function cloudstate<
    T extends (new (...args: any[]) => any) & {
        id?: string;
    },
>
    (target: T, ...args: any): T;

export declare function useCloud<
    T extends {

        new(...args: any[]): any;
        id?: string;
    },
>(
    id: T["id"] extends string ? T["id"] : string,
    _reserved?: undefined,
    options?: FreestyleOptions,
): CloudState<InstanceType<T>>;

export declare function useRequest(): Request;

export declare function useLocal<
    T extends {
        new(...args: any[]): any;
        id?: string;
    },
>(target: T | (T["id"] extends string ? T["id"] : string)): InstanceType<T>;

export type FreestyleConfig = {
    /**
     * Configuration for the dev server.
     */
    dev?: {
        /**
         * Setup any dev server data you want to always be available.
         * @example
         * ```ts
         * import { defineConfig } from "freestyle-sh";
         * import { Counter } from "./my-class.ts";
         *
         * export default defineConfig({
         *   dev: {
         *     initializeCloudstate: ({ useLocal }) => {
         *       useLocal(Counter).count = 5;
         *     },
         *   },
         * });
         * ```
         */
        initializeCloudstate?: (options: {
            useLocal<T>(obj: new () => T): InstanceType<typeof obj>;
        }) => void;

        /**
         * The address of the server to proxy non cloudstate requests to.
         * @default "http://localhost:4321"
         */
        proxy?: string;
        /**
         * The command to run to start the dev server.
         * @default "npm run dev"
         */
        command?: string;
    };
    deploy?: {
        web?: {
            entryPoint?: string;
            envVars?: Record<string, string>;
        };
        cloudstate?: {
            envVars?: Record<string, string>;
        };
    };
};

export declare function defineConfig(
    config: FreestyleConfig,
): FreestyleConfig;

export declare function invalidate(method: (...args: any[]) => any): void;

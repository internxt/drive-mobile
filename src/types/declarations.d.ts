declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;

  export default content;
}

declare module '@hookform/resolvers/yup' {
  import { Resolver } from 'react-hook-form';
  import { AnyObjectSchema, InferType } from 'yup';

  export function yupResolver<T extends AnyObjectSchema>(
    schema: T,
    schemaOptions?: object,
    resolverOptions?: { mode?: 'async' | 'sync'; raw?: boolean },
  ): Resolver<InferType<T>>;
}

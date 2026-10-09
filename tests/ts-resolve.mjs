// Lets Node resolve extensionless relative imports (Metro style) to .ts files in tests.
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (e) {
      if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) return next(specifier + '.ts', context);
      throw e;
    }
  },
});

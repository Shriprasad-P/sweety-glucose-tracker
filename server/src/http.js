export class HttpError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const [issue] = result.error.issues;
  throw new HttpError(400, 'INVALID_INPUT', issue.message, issue.path[0]);
}

export function mutationGuard(origin) {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const source = req.get('Origin');
    if (req.get('X-Sweety-Request') !== '1' || (source && source !== origin)) {
      throw new HttpError(
        403,
        'FORBIDDEN',
        'This request did not come from an allowed client.',
      );
    }
    next();
  };
}

export function handleError(error, _req, res, next) {
  if (res.headersSent) return next(error);
  let known = error instanceof HttpError ? error : null;
  if (error.type === 'entity.parse.failed')
    known = new HttpError(400, 'INVALID_JSON', 'Send valid JSON.');
  if (error.type === 'entity.too.large')
    known = new HttpError(
      413,
      'REQUEST_TOO_LARGE',
      'The request is too large.',
    );
  if (!known) {
    console.error('Unexpected request failure', error.name);
    known = new HttpError(
      500,
      'INTERNAL_ERROR',
      'Something went wrong. Please try again.',
    );
  }
  res.status(known.status).json({
    error: { code: known.code, message: known.message, field: known.field },
  });
}

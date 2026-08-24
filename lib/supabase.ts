import { createClient } from '@supabase/supabase-js'

const rawClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Real, network-level enforcement of the Viewer role's "read only,
// can't edit a single thing" requirement. This is deliberately done
// ONCE here rather than by checking role in every individual page's
// save/delete handler -- every page in the app imports this same
// `supabase` object, so wrapping it here blocks every write call site
// in the whole codebase in one place, instead of relying on hundreds
// of individual UI checks that could each be missed or bypassed.
let isViewer = false

async function refreshViewerFlag() {
  const { data: { session } } = await rawClient.auth.getSession()
  if (!session?.user?.email) { isViewer = false; return }
  const { data } = await rawClient
    .from('team_members')
    .select('role')
    .eq('email', session.user.email)
    .order('created_at', { ascending: false })
    .limit(1)
  isViewer = (data?.[0]?.role ?? '').trim().toLowerCase() === 'viewer'
}

rawClient.auth.onAuthStateChange(() => { refreshViewerFlag() })
refreshViewerFlag()

const READ_ONLY_ERROR = { message: "You're on a Viewer account -- read-only. Ask an Admin to make changes." }

// A stub that behaves like a Supabase query builder for chaining
// purposes (.select().eq().single() etc all just return itself) but
// always resolves to the read-only error instead of ever reaching the
// network. Needed because blocked calls like
// `supabase.from(x).insert(y).select().single()` chain further calls
// AFTER insert/update/upsert/delete -- returning a bare blocked Promise
// there would crash on `.select is not a function` instead of failing
// gracefully with the read-only message.
function blockedThenable(): any {
  const stub: any = {
    then: (resolve: any) => resolve({ data: null, error: READ_ONLY_ERROR }),
    catch: () => proxy,
    finally: (cb: any) => { cb?.(); return proxy },
  }
  const proxy: any = new Proxy(stub, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop]
      // any chained method call (.select(), .eq(), .single(), etc.)
      // returns the SAME proxy again, so arbitrarily long chains all
      // keep resolving to the read-only error rather than breaking
      // after the first hop.
      return () => proxy
    },
  })
  return proxy
}

function wrapQueryBuilder(builder: any) {
  const orig = {
    insert: builder.insert.bind(builder),
    update: builder.update.bind(builder),
    upsert: builder.upsert.bind(builder),
    delete: builder.delete.bind(builder),
  }
  builder.insert = (...args: any[]) => (isViewer ? blockedThenable() : orig.insert(...args))
  builder.update = (...args: any[]) => (isViewer ? blockedThenable() : orig.update(...args))
  builder.upsert = (...args: any[]) => (isViewer ? blockedThenable() : orig.upsert(...args))
  builder.delete = (...args: any[]) => (isViewer ? blockedThenable() : orig.delete(...args))
  return builder
}

function wrapStorageBucket(bucket: any) {
  const origUpload = bucket.upload.bind(bucket)
  const origRemove = bucket.remove.bind(bucket)
  bucket.upload = (...args: any[]) => (isViewer ? Promise.resolve({ data: null, error: READ_ONLY_ERROR }) : origUpload(...args))
  bucket.remove = (...args: any[]) => (isViewer ? Promise.resolve({ data: null, error: READ_ONLY_ERROR }) : origRemove(...args))
  return bucket
}

export const supabase = new Proxy(rawClient, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => wrapQueryBuilder((target as any).from(table))
    }
    if (prop === 'storage') {
      const storage = (target as any).storage
      return new Proxy(storage, {
        get(storageTarget, storageProp) {
          if (storageProp === 'from') {
            return (bucket: string) => wrapStorageBucket(storageTarget.from(bucket))
          }
          return Reflect.get(storageTarget, storageProp)
        },
      })
    }
    return Reflect.get(target, prop, receiver)
  },
}) as typeof rawClient

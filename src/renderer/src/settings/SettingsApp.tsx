import { useEffect, useMemo, useState } from 'react'
import { PROVIDERS, type AiProvider, type AiSettingsPublic } from '../../../shared/ai'

type TestResult = { ok: boolean; message: string } | null

export function SettingsApp() {
  const [loaded, setLoaded] = useState<AiSettingsPublic | null>(null)
  const [provider, setProvider] = useState<AiProvider | null>(null)
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('') // empty = keep stored key
  const [showKey, setShowKey] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<string[] | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult>(null)
  const [saved, setSaved] = useState(false)

  const info = useMemo(() => PROVIDERS.find((p) => p.id === provider) ?? null, [provider])

  useEffect(() => {
    window.aimi.ai.getSettings().then((s) => {
      setLoaded(s)
      setProvider(s.provider)
      setModel(s.model)
      setBaseUrl(s.baseUrl)
    })
  }, [])

  useEffect(() => {
    if (provider === 'ollama') {
      window.aimi.ai.listOllamaModels(baseUrl || 'http://localhost:11434/v1').then(setOllamaModels)
    }
  }, [provider, baseUrl])

  const pickProvider = (p: AiProvider) => {
    const pi = PROVIDERS.find((x) => x.id === p)!
    setProvider(p)
    setTestResult(null)
    setSaved(false)
    setBaseUrl(pi.defaultBaseUrl ?? '')
    setModel(pi.models[0] ?? '')
  }

  const currentUpdate = () => ({
    provider: provider!,
    model,
    baseUrl,
    ...(apiKey !== '' ? { apiKey } : {})
  })

  const runTest = async () => {
    if (!provider || !model) return
    setTesting(true)
    setTestResult(null)
    const result = await window.aimi.ai.test(currentUpdate())
    setTesting(false)
    setTestResult(result)
  }

  const save = async () => {
    if (!provider || !model) return
    const s = await window.aimi.ai.setSettings(currentUpdate())
    setLoaded(s)
    setApiKey('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const modelSuggestions = provider === 'ollama' ? (ollamaModels ?? []) : (info?.models ?? [])
  const canSave = !!provider && !!model && (!info?.needsKey || apiKey !== '' || loaded?.hasKey)

  return (
    <div className="settings">
      <header>
        <h1>GIVE AIMI A BRAIN</h1>
        <p>
          Pick any AI provider. Your key is stored encrypted on this Mac and only ever talks to the provider you
          choose. Ollama runs 100% local and free.
        </p>
      </header>

      <section>
        <h2>PROVIDER</h2>
        <div className="provider-grid">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`provider-card${provider === p.id ? ' active' : ''}`}
              onClick={() => pickProvider(p.id)}
            >
              <span className="provider-swatch" style={{ background: p.color }} />
              <span className="provider-label">{p.label}</span>
            </button>
          ))}
        </div>
        {info?.hint && <div className="hint">{info.hint}</div>}
      </section>

      {info && (
        <>
          {info.needsBaseUrl && (
            <section>
              <h2>SERVER URL</h2>
              <input
                type="text"
                value={baseUrl}
                placeholder={info.defaultBaseUrl ?? 'https://…/v1'}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </section>
          )}

          {info.needsKey && (
            <section>
              <h2>API KEY {loaded?.hasKey && provider === loaded.provider && <span className="badge">SAVED</span>}</h2>
              <div className="key-row">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  placeholder={loaded?.hasKey && provider === loaded.provider ? '******** (keep current)' : 'sk-...'}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button className="ghost" onClick={() => setShowKey(!showKey)}>
                  {showKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </section>
          )}

          <section>
            <h2>MODEL</h2>
            {modelSuggestions.length > 0 && (
              <div className="model-chips">
                {modelSuggestions.map((m) => (
                  <button key={m} className={`chip${model === m ? ' active' : ''}`} onClick={() => setModel(m)}>
                    {m}
                  </button>
                ))}
              </div>
            )}
            {provider === 'ollama' && ollamaModels === null && (
              <div className="warn">OLLAMA DOESN'T SEEM TO BE RUNNING ON THIS MAC. START IT AND COME BACK!</div>
            )}
            <input
              type="text"
              value={model}
              placeholder="or type any model id"
              onChange={(e) => setModel(e.target.value)}
            />
          </section>

          <section className="actions">
            <button className="ghost" onClick={runTest} disabled={testing || !model}>
              {testing ? 'TESTING...' : 'TEST CONNECTION'}
            </button>
            <button className="primary" onClick={save} disabled={!canSave}>
              {saved ? 'SAVED!' : 'SAVE'}
            </button>
          </section>

          {testResult && (
            <div className={testResult.ok ? 'test-ok' : 'test-fail'}>
              {testResult.ok ? `IT'S ALIVE! > "${testResult.message}"` : `HMM: ${testResult.message}`}
            </div>
          )}
        </>
      )}

      <footer>EVERYTHING STAYS ON YOUR MACHINE. NO ACCOUNT, NO TELEMETRY, NO CLOUD — JUST YOU AND YOUR PET.</footer>
    </div>
  )
}

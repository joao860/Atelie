# Ateliê da Duda

Vitrine, cardápio digital, carrinho local e fechamento de pedido pelo WhatsApp. O frontend usa HTML, CSS e JavaScript sem framework. A administração usa Cloudflare Pages Functions para autenticação, upload e persistência pela API do GitHub.

## Rodar localmente

Requer Node.js. Não há `package.json` nem etapa de build.

```bash
npx wrangler pages dev . --port 8788
```

Acesse `http://127.0.0.1:8788`. Sem variáveis seguras, o site público funciona, mas o admin informa que o servidor não está configurado. O modo demonstração foi removido.

Para testar o admin real localmente, defina as variáveis apenas no processo ou em `.dev.vars` ignorado pelo Git. Nunca versione esse arquivo.

## Site público

- `index.html`: home.
- `cardapio.html`: catálogo e filtros.
- `produto.html?slug=bolo-de-pote`: produto, sabor obrigatório e quantidade.
- `pedido.html`: carrinho persistido em `localStorage`.
- `sobre.html`: história da marca.

Todos os links e assets usam caminhos compatíveis com GitHub Pages. A URL com `produto.html?slug=...` é intencional.

## Admin

Acesse `/admin/login.html`. Não existe acesso demo: login, sessão e todas as escritas dependem da API segura. O painel gerencia dashboard, produtos, sabores, categorias e configurações. O botão **Sair** invalida o cookie.

## Configurar senha

Escolha a senha fora do código e gere seu SHA-256 hexadecimal:

```bash
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.argv[1])).then(b=>console.log(Buffer.from(b).toString('hex')))" "SUA_SENHA"
```

Cadastre o resultado como `ADMIN_PASSWORD_HASH`. A senha original nunca deve entrar no HTML, JavaScript, JSON, Git, `localStorage` ou `sessionStorage`.

Crie também um segredo longo e aleatório para `SESSION_SECRET`, por exemplo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configurar GitHub

Crie um token fine-grained restrito somente ao repositório do site, com permissão **Contents: Read and write**. Configure no servidor:

- `GITHUB_TOKEN`: token fine-grained.
- `GITHUB_REPO`: `usuario/repositorio`.
- `GITHUB_BRANCH`: branch publicada, normalmente `main`.

Ao salvar, a Function consulta o SHA atual e envia esse SHA ao GitHub Contents API. Conflitos retornam uma mensagem para recarregar antes de tentar novamente.

## Configurar Cloudflare Worker / Pages Functions

As Functions atuais ficam em `functions/api/`. No Cloudflare Pages, configure:

- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `GITHUB_BRANCH`

Arquitetura gratuita recomendada:

```text
Site público (GitHub Pages)
Admin estático + API (Cloudflare Pages, mesmo domínio)
Cloudflare Function → GitHub API → commit → novo deploy do GitHub Pages
```

Manter admin e API no mesmo domínio Cloudflare evita cookies cross-site e CORS amplo. O frontend público pode ser publicado separadamente no GitHub Pages. Nenhum segredo é necessário no host público.

## Upload de fotos

No produto, cada sabor possui **Enviar foto**. Formatos aceitos: JPEG, PNG e WebP, até 5 MB. A Function valida tipo e tamanho e grava em `assets/products/` via GitHub API. O caminho retornado é colocado no JSON automaticamente.

Recomendação: WebP, cerca de 1200×1500, proporção 4:5. O sistema não recorta a imagem.

O upload e a atualização do produto são commits separados. Se a foto subir e o JSON falhar, ela permanece no repositório e pode ser reutilizada ou removida manualmente.

## WhatsApp

O número central fica em `data/settings.json`, propriedade `contact.whatsappNumber`, somente com dígitos no padrão DDI + DDD + número. Também pode ser editado em **Admin → Configurações → Contato**.

O carrinho não é limpo ao abrir o WhatsApp. Depois, o cliente decide entre manter o pedido ou confirmar a limpeza.

## Publicar no GitHub Pages

1. Publique a raiz do repositório pelo GitHub Pages.
2. Mantenha os arquivos `.html` nos links; não dependa de rewrites.
3. Hospede o admin e as Functions no Cloudflare Pages com as variáveis seguras.
4. Quando o admin fizer commits nos JSONs ou imagens, o GitHub Pages fará novo deploy.

Não existe build command. Não publique `.dev.vars`, tokens ou hashes em arquivos públicos.

## Alterar logo

A logo oficial está em `assets/logo/logo-atelie-da-duda.png` e é usada no header, footer e favicon. Para atualizá-la no futuro, substitua esse arquivo mantendo o mesmo nome e proporção quadrada. As dimensões de apresentação ficam centralizadas em `.brand-mark--logo` no arquivo `css/components.css`.

## Estrutura de dados

- `data/products.json`: produtos e sabores.
- `data/categories.json`: categorias, status e ordem.
- `data/settings.json`: marca, contato, funcionamento e banner.
- `assets/products/`: fotos.
- `admin/`: interface administrativa estática.
- `functions/api/`: autenticação, sessão, conteúdo e upload.

## Segurança

- Senhas e tokens existem somente nas variáveis server-side.
- A senha é comparada por hash SHA-256 no servidor.
- A sessão é assinada por HMAC, expira em oito horas e usa cookie `HttpOnly`, `Secure` e `SameSite=Strict`.
- Escritas aceitam apenas arquivos de dados permitidos.
- Upload exige sessão, restringe MIME e limita 5 MB.
- O token GitHub deve ter privilégio mínimo.
- GitHub Pages sozinho não protege um admin; nunca implemente autenticação apenas escondendo HTML com JavaScript.

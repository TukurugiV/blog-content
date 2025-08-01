import { visit } from "unist-util-visit";

// URL patterns for different services
const URL_PATTERNS = {
  youtube: /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  twitter: /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  codepen: /^https?:\/\/codepen\.io\/[\w-]+\/pen\/([a-zA-Z0-9]+)/,
  github: /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:\/.*)?/,
  codesandbox: /^https?:\/\/codesandbox\.io\/s\/([a-zA-Z0-9-]+)/,
};

/**
 * Remark plugin to convert URLs into embed cards
 */
export function remarkEmbedCards() {
  return (tree) => {
    visit(tree, 'paragraph', (node, index, parent) => {
      // Check if paragraph contains only a single link
      if (node.children.length === 1 && node.children[0].type === 'link') {
        const linkNode = node.children[0];
        const url = linkNode.url;
        
        // Check if link text is the same as URL (indicating a bare URL)
        const isPlainUrl = linkNode.children.length === 1 && 
                          linkNode.children[0].type === 'text' && 
                          linkNode.children[0].value === url;
        
        if (isPlainUrl) {
          const embedHtml = createEmbedCard(url);
          if (embedHtml) {
            // Replace the paragraph with the embed
            parent.children[index] = {
              type: 'html',
              value: embedHtml
            };
          }
        }
      }
      
      // Also check for standalone text nodes that are URLs
      else if (node.children.length === 1 && node.children[0].type === 'text') {
        const text = node.children[0].value.trim();
        if (text.match(/^https?:\/\//)) {
          const embedHtml = createEmbedCard(text);
          if (embedHtml) {
            parent.children[index] = {
              type: 'html',
              value: embedHtml
            };
          }
        }
      }
    });
  };
}

/**
 * Create embed card HTML based on URL
 */
function createEmbedCard(url) {
  // YouTube
  const youtubeMatch = url.match(URL_PATTERNS.youtube);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return createYouTubeEmbed(videoId, url);
  }
  
  // Twitter/X
  const twitterMatch = url.match(URL_PATTERNS.twitter);
  if (twitterMatch) {
    const tweetId = twitterMatch[1];
    return createTwitterEmbed(tweetId, url);
  }
  
  // CodePen
  const codepenMatch = url.match(URL_PATTERNS.codepen);
  if (codepenMatch) {
    const penId = codepenMatch[1];
    return createCodePenEmbed(penId, url);
  }
  
  // GitHub
  const githubMatch = url.match(URL_PATTERNS.github);
  if (githubMatch) {
    const [, owner, repo] = githubMatch;
    return createGitHubEmbed(owner, repo, url);
  }
  
  // CodeSandbox
  const codesandboxMatch = url.match(URL_PATTERNS.codesandbox);
  if (codesandboxMatch) {
    const sandboxId = codesandboxMatch[1];
    return createCodeSandboxEmbed(sandboxId, url);
  }
  
  return null;
}

/**
 * Create YouTube embed
 */
function createYouTubeEmbed(videoId, originalUrl) {
  return `
    <div class="embed-card youtube-embed">
      <div class="embed-container">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
          allowfullscreen>
        </iframe>
      </div>
      <div class="embed-footer">
        <div class="embed-icon">▶️</div>
        <div class="embed-info">
          <div class="embed-title">YouTube動画</div>
          <div class="embed-url">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer">
              ${originalUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create Twitter embed
 */
function createTwitterEmbed(tweetId, originalUrl) {
  return `
    <div class="embed-card twitter-embed">
      <div class="embed-content">
        <blockquote class="twitter-tweet" data-dnt="true">
          <a href="${originalUrl}"></a>
        </blockquote>
      </div>
      <div class="embed-footer">
        <div class="embed-icon">🐦</div>
        <div class="embed-info">
          <div class="embed-title">Twitter/X 投稿</div>
          <div class="embed-url">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer">
              ${originalUrl}
            </a>
          </div>
        </div>
      </div>
      <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
    </div>
  `;
}

/**
 * Create CodePen embed
 */
function createCodePenEmbed(penId, originalUrl) {
  return `
    <div class="embed-card codepen-embed">
      <div class="embed-container">
        <iframe 
          src="https://codepen.io/embed/${penId}?default-tab=result" 
          title="CodePen Embed" 
          frameborder="0" 
          loading="lazy" 
          allowtransparency="true" 
          allowfullscreen="true">
        </iframe>
      </div>
      <div class="embed-footer">
        <div class="embed-icon">🖊️</div>
        <div class="embed-info">
          <div class="embed-title">CodePen</div>
          <div class="embed-url">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer">
              ${originalUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create GitHub embed
 */
function createGitHubEmbed(owner, repo, originalUrl) {
  return `
    <div class="embed-card github-embed">
      <div class="embed-content">
        <div class="github-card">
          <div class="github-header">
            <div class="github-icon">📁</div>
            <div class="github-info">
              <div class="github-repo">${owner}/${repo}</div>
              <div class="github-description">GitHubリポジトリ</div>
            </div>
          </div>
          <div class="github-actions">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="github-button">
              リポジトリを見る
            </a>
          </div>
        </div>
      </div>
      <div class="embed-footer">
        <div class="embed-icon">🐙</div>
        <div class="embed-info">
          <div class="embed-title">GitHub</div>
          <div class="embed-url">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer">
              ${originalUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create CodeSandbox embed
 */
function createCodeSandboxEmbed(sandboxId, originalUrl) {
  return `
    <div class="embed-card codesandbox-embed">
      <div class="embed-container">
        <iframe 
          src="https://codesandbox.io/embed/${sandboxId}" 
          title="CodeSandbox" 
          frameborder="0" 
          loading="lazy" 
          allowtransparency="true" 
          allowfullscreen="true">
        </iframe>
      </div>
      <div class="embed-footer">
        <div class="embed-icon">📦</div>
        <div class="embed-info">
          <div class="embed-title">CodeSandbox</div>
          <div class="embed-url">
            <a href="${originalUrl}" target="_blank" rel="noopener noreferrer">
              ${originalUrl}
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}
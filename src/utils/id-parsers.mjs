function isBareIdentifier(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value) && !value.includes('/');
}

export function parseTaskId(input) {
  if (!input) {
    return null;
  }

  if (isBareIdentifier(input)) {
    return input;
  }

  const shortMatch = input.match(/clickup\.com\/t\/([a-zA-Z0-9]+)/);
  if (shortMatch) {
    return shortMatch[1];
  }

  const longMatch = input.match(/[?&]p=([a-zA-Z0-9]+)/);
  if (longMatch) {
    return longMatch[1];
  }

  const pathMatch = input.match(/\/([a-zA-Z0-9]{7,})(?:\?|$)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  return input;
}

export function parseListId(input) {
  if (!input) {
    return null;
  }

  if (/^\d+$/.test(input)) {
    return input;
  }

  const listMatch = input.match(/\/li\/(\d+)/);
  if (listMatch) {
    return listMatch[1];
  }

  return null;
}

export function parseDocId(input) {
  if (!input) {
    return null;
  }

  if (isBareIdentifier(input)) {
    return input;
  }

  const docCenterMatch = input.match(/\/dc\/([a-zA-Z0-9_-]+)/);
  if (docCenterMatch) {
    return docCenterMatch[1];
  }

  const docsMatch = input.match(/\/docs\/([a-zA-Z0-9_-]+)/);
  if (docsMatch) {
    return docsMatch[1];
  }

  const shareMatch = input.match(/\/d\/h\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (shareMatch) {
    return shareMatch[1];
  }

  return input;
}

export function parsePageId(input) {
  if (!input) {
    return null;
  }

  if (isBareIdentifier(input)) {
    return input;
  }

  const pageMatch = input.match(/[?&]page=([a-zA-Z0-9_-]+)/);
  if (pageMatch) {
    return pageMatch[1];
  }

  const docCenterMatch = input.match(/\/dc\/[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/);
  if (docCenterMatch) {
    return docCenterMatch[1];
  }

  const shareMatch = input.match(/\/d\/h\/[a-zA-Z0-9_-]+\/[^/]+\/([a-zA-Z0-9_-]+)(?:[/?#]|$)/);
  if (shareMatch) {
    return shareMatch[1];
  }

  return input;
}

export function createDocService({ client, userService }) {
  function buildQueryString(paramsBuilder) {
    const params = new URLSearchParams();
    paramsBuilder(params);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  async function listDocsPage(workspaceId, options = {}) {
    const query = buildQueryString((params) => {
      params.set('limit', String(options.limit ?? 100));

      if (options.id) {
        params.set('id', options.id);
      }
      if (options.creator) {
        params.set('creator', String(options.creator));
      }
      if (options.deleted) {
        params.set('deleted', 'true');
      }
      if (options.archived) {
        params.set('archived', 'true');
      }
      if (options.parentId) {
        params.set('parent_id', options.parentId);
      }
      if (options.parentType) {
        params.set('parent_type', String(options.parentType));
      }

      if (options.cursor) {
        // ClickUp documents the `cursor` parameter, but the docs endpoint currently
        // paginates only when the deprecated `next_cursor` parameter is provided.
        params.set('next_cursor', options.cursor);
      }
    });

    return client.requestV3(`/workspaces/${workspaceId}/docs${query}`);
  }

  async function searchDocs(options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    const docs = [];
    const seenCursors = new Set();
    let cursor = null;

    while (true) {
      const response = await listDocsPage(workspaceId, { ...options, cursor });
      docs.push(...(response.docs ?? []));
      cursor = response.next_cursor ?? null;

      if (!cursor || seenCursors.has(cursor)) {
        break;
      }

      seenCursors.add(cursor);
    }

    if (!options.query) {
      return docs;
    }

    const normalizedQuery = options.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return docs;
    }

    return docs.filter((doc) => doc.name?.toLowerCase().includes(normalizedQuery));
  }

  async function getDoc(docId) {
    const workspaceId = await userService.getWorkspaceId();
    return client.requestV3(`/workspaces/${workspaceId}/docs/${docId}`);
  }

  async function getDocPageListing(docId, options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    const query = buildQueryString((params) => {
      if (options.maxPageDepth !== undefined) {
        params.set('max_page_depth', String(options.maxPageDepth));
      }
    });
    const response = await client.requestV3(
      `/workspaces/${workspaceId}/docs/${docId}/page_listing${query}`
    );

    if (Array.isArray(response)) {
      return response;
    }

    return response.pages ?? [];
  }

  async function getPage(docId, pageId, contentFormat = 'text/md') {
    const workspaceId = await userService.getWorkspaceId();
    const query = buildQueryString((params) => {
      if (contentFormat) {
        params.set('content_format', contentFormat);
      }
    });
    const page = await client.requestV3(
      `/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}${query}`
    );

    if (typeof page === 'string') {
      return {
        id: pageId,
        name: pageId,
        content: page,
      };
    }

    return page;
  }

  async function createDoc(name, options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    const doc = await client.requestV3(`/workspaces/${workspaceId}/docs`, {
      method: 'POST',
      body: {
        name,
        ...(options.parent ? { parent: options.parent } : {}),
        ...(options.visibility ? { visibility: options.visibility } : {}),
      },
    });

    if (options.content && doc.id) {
      const pages = await getDocPageListing(doc.id);
      if (pages.length > 0) {
        const firstPageId = pages[0].id;
        await editPage(doc.id, firstPageId, { content: options.content });
        return {
          ...doc,
          firstPageId,
        };
      }
    }

    return doc;
  }

  async function createPage(docId, name, options = {}) {
    const workspaceId = await userService.getWorkspaceId();
    return client.requestV3(`/workspaces/${workspaceId}/docs/${docId}/pages`, {
      method: 'POST',
      body: {
        name,
        ...(options.content !== undefined ? { content: options.content } : {}),
        ...(options.contentFormat ? { content_format: options.contentFormat } : {}),
        ...(options.parentPageId ? { parent_page_id: options.parentPageId } : {}),
        ...(options.subTitle !== undefined ? { sub_title: options.subTitle } : {}),
      },
    });
  }

  async function editPage(docId, pageId, updates) {
    const workspaceId = await userService.getWorkspaceId();
    const body = {};
    if (updates.name !== undefined) {
      body.name = updates.name;
    }
    if (updates.content !== undefined) {
      body.content = updates.content;
    }
    if (updates.subTitle !== undefined) {
      body.sub_title = updates.subTitle;
    }
    if (updates.contentEditMode !== undefined) {
      body.content_edit_mode = updates.contentEditMode;
    }
    if (updates.contentFormat !== undefined) {
      body.content_format = updates.contentFormat;
    }

    return client.requestV3(`/workspaces/${workspaceId}/docs/${docId}/pages/${pageId}`, {
      method: 'PUT',
      body,
    });
  }

  return {
    searchDocs,
    getDoc,
    getDocPageListing,
    getPage,
    createDoc,
    createPage,
    editPage,
  };
}

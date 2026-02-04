const axios = require('axios');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { sessionToken, action, operationId, filters } = body;

    const cleanToken = sessionToken.replace(/^Bearer\s+/i, '');

    const airtmClient = axios.create({
      baseURL: 'https://app.airtm.com/api/v1',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Referer': 'https://app.airtm.com/peer-transfers/available',
        'Origin': 'https://app.airtm.com',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (action === 'poll') {
      try {
        // Exact GraphQL query used by the Airtm web app
        // A more modern, simplified query that fetches "p2pAvailableOperations" 
        // which is often used in the newer Airtm dashboard versions
        const graphqlQuery = {
          operationName: "GetP2PAvailableOperations",
          query: `query GetP2PAvailableOperations($filter: Operations__P2PFilterInput) {
                      p2pAvailableOperations(filter: $filter) {
                        id
                        hash
                        status
                        createdAt
                        grossAmount
                        netAmount
                        operationType
                        metadata
                        makerPaymentMethod {
                          id
                          categoryId
                          data
                          version {
                            id
                            category {
                              id
                              translationTag
                            }
                          }
                        }
                      }
                      availableOperations {
                        id
                        hash
                        status
                        grossAmount
                        netAmount
                        operationType
                      }
                    }`,
          variables: {
            filter: {
              // We leave this mostly empty or broad to ensure we catch everything
              status: ["CREATED", "OPEN", "AVAILABLE", "READY", "FRAUD_APPROVED"]
            }
          }
        };

        const response = await axios({
          method: 'POST',
          url: 'https://app.airtm.com/graphql',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'Referer': 'https://app.airtm.com/peer-transfers/available',
            'X-Airtm-Platform': 'web',
            'X-Airtm-App-Version': '12.62.30',
            'X-Requested-With': 'XMLHttpRequest',
            'x-webapp-name': 'webapp-milotic',
            'x-device-type': 'desktop',
            'apollographql-client-name': 'web',
            'accept-language': 'es'
          },
          data: graphqlQuery,
          timeout: 10000
        });

        const gqlData = response.data?.data || {};
        // Combine results from both possible sources
        const ops1 = gqlData.p2pAvailableOperations || [];
        const ops2 = gqlData.availableOperations || [];
        const availableOps = [...ops1, ...ops2];

        // Log count if any
        if (availableOps.length > 0) {
          console.log(`[Proxy] Detected ${availableOps.length} operations via GraphQL`);
        }

        // Return debug info to help identifies keys if empty
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...response.data,
            _debug: {
              keys: Object.keys(gqlData),
              count: availableOps.length,
              source: 'graphql'
            }
          })
        };
      } catch (gqlError) {
        console.warn('GraphQL fallback to REST:', gqlError.response?.data || gqlError.message);

        // If it's a 401/403, don't even try REST
        if (gqlError.response?.status === 401 || gqlError.response?.status === 403) {
          throw gqlError;
        }

        // Fallback to REST if GraphQL fails
        const response = await airtmClient.get('/p2p/operations', {
          params: {
            status: 'OPEN',
            type: 'ACCEPT_TRANSACTION',
            page: 1,
            limit: 20
          }
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ...response.data,
            _debug: {
              source: 'rest',
              count: (Array.isArray(response.data) ? response.data.length : (response.data.results?.length || 0))
            }
          })
        };
      }
    } else if (action === 'accept') {
      if (!operationId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Operation ID is required' }) };
      }

      const response = await airtmClient.post(`/p2p/operations/${operationId}/accept`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data)
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('Airtm Proxy Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to communicate with Airtm',
        details: error.response?.data || error.message
      })
    };
  }
};

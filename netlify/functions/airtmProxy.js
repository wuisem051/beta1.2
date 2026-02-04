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

        if (!sessionToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Session token is required' })
            };
        }

        const airtmClient = axios.create({
            baseURL: 'https://app.airtm.com/api/v1',
            headers: {
                'Authorization': `Bearer ${sessionToken}`, // Airtm uses Bearer or Cookie, we'll try Bearer first or allow user to send full header
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Referer': 'https://app.airtm.com/dashboard/cashier',
                'Origin': 'https://app.airtm.com'
            }
        });

        if (action === 'poll') {
            try {
                // Correct GraphQL query based on current Airtm response structure
                const graphqlQuery = {
                    operationName: "getAvailableOperations",
                    query: `query getAvailableOperations {
                          availableOperations {
                            id
                            operationType
                            status
                            grossAmount
                            netAmount
                            createdAt
                            peer {
                              firstName
                              lastName
                              numbers {
                                score
                              }
                            }
                            makerPaymentMethod {
                              category {
                                id
                                translationTag
                              }
                            }
                          }
                        }`,
                    variables: {}
                };

                const response = await axios({
                    method: 'POST',
                    url: 'https://app.airtm.com/graphql',
                    headers: {
                        'Authorization': `Bearer ${sessionToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    },
                    data: graphqlQuery
                });

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(response.data)
                };
            } catch (gqlError) {
                console.warn('GraphQL fallback to REST:', gqlError.message);
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
                    body: JSON.stringify(response.data)
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

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
        const graphqlQuery = {
          operationName: "AvailableOperations",
          query: `query AvailableOperations($filter: Operations__FilterInput) {
                      availableOperations(filter: $filter) {
                        id
                        hash
                        operationType
                        status
                        isMine
                        createdAt
                        updatedAt
                        grossAmount
                        netAmount
                        metadata
                        walletCurrency {
                          ...CurrencyData
                          __typename
                        }
                        peer {
                          ...UserData
                          __typename
                        }
                        ... on Operations__Buy {
                          rate
                          rateInfo {
                            id
                            netAmount
                            grossAmount
                            fundsToReceiveMaker
                            fundsToReceiveTaker
                            fundsToSendMaker
                            fundsToSendTaker
                            __typename
                          }
                          displayRate {
                            direction
                            rate
                            __typename
                          }
                          currency {
                            ...CurrencyData
                            __typename
                          }
                          makerPaymentMethod {
                            ...PaymentMethodInstance
                            __typename
                          }
                          __typename
                        }
                        ... on Operations__Sell {
                          rate
                          rateInfo {
                            id
                            netAmount
                            grossAmount
                            fundsToReceiveMaker
                            fundsToReceiveTaker
                            fundsToSendMaker
                            fundsToSendTaker
                            __typename
                          }
                          displayRate {
                            direction
                            rate
                            __typename
                          }
                          currency {
                            ...CurrencyData
                            __typename
                          }
                          makerPaymentMethod {
                            ...PaymentMethodInstance
                            __typename
                          }
                          __typename
                        }
                        __typename
                      }
                    }

                    fragment CurrencyData on Catalogs__Currency {
                      id
                      symbol
                      precision
                      __typename
                    }

                    fragment UserData on Auth__AnyUser {
                      ... on Auth__OperationUser {
                        id
                        firstName
                        lastName
                        createdAt
                        country
                        countryInfo {
                          id
                          image {
                            id
                            urls
                            __typename
                          }
                          __typename
                        }
                        securityHub {
                          id
                          tierLevel
                          facialVerified
                          documentVerified
                          verificationStatusName
                          __typename
                        }
                        numbers {
                          id
                          score
                          completedOperations
                          __typename
                        }
                        preferences {
                          id
                          profile {
                            id
                            avatar
                            language
                            __typename
                          }
                          __typename
                        }
                        __typename
                      }
                      __typename
                    }

                    fragment PaymentMethodInstance on PaymentMethods__Instance {
                      id
                      data
                      categoryId
                      isThirdPartyInstance
                      version {
                        id
                        image {
                          id
                          urls
                          __typename
                        }
                        category {
                          id
                          translationTag
                          ancestor(level: 2) {
                            id
                            translationTag
                            __typename
                          }
                          __typename
                        }
                        __typename
                      }
                      __typename
                    }`,
          variables: {
            filter: {
              status: ["CREATED", "FRAUD_APPROVED"],
              operationTypes: ["BUY", "SELL"]
            }
          }
        };

        const response = await axios({
          method: 'POST',
          url: 'https://app.airtm.com/graphql',
          headers: {
            'Authorization': `Bearer ${cleanToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://app.airtm.com/peer-transfers/available',
            'X-Requested-With': 'XMLHttpRequest'
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

import json

# Standard CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def lambda_handler(event, context):
    """Simple matches handler with CORS"""
    try:
        # Handle CORS preflight request
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }
        
        # Parse query parameters
        query_params = event.get('queryStringParameters', {}) or {}
        candidate_id = query_params.get('candidateId')
        
        if not candidate_id:
            return {
                'statusCode': 400,
                'headers': {
                    **CORS_HEADERS,
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'candidateId is required'
                })
            }
        
        # Return mock matches for now
        return {
            'statusCode': 200,
            'headers': {
                **CORS_HEADERS,
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': True,
                'data': [
                    {
                        'jobId': '1',
                        'title': 'Software Engineer',
                        'company': 'Tech Corp',
                        'location': 'Remote',
                        'matchPercent': 85,
                        'matchedSkills': ['Python', 'JavaScript'],
                        'jobType': 'Full-time',
                        'description': 'Great match for your skills'
                    }
                ],
                'totalMatches': 1,
                'candidateId': candidate_id
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                **CORS_HEADERS,
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
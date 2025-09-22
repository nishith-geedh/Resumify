import json

# Standard CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}

def lambda_handler(event, context):
    """Simple jobs handler with CORS"""
    try:
        http_method = event.get('httpMethod', 'GET')
        
        # Handle CORS preflight request
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': ''
            }
        
        # Return mock data for now
        if http_method == 'GET':
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
                            'type': 'full-time',
                            'requiredSkills': ['Python', 'JavaScript'],
                            'description': 'Great opportunity for a software engineer'
                        }
                    ]
                })
            }
        elif http_method == 'POST':
            return {
                'statusCode': 201,
                'headers': {
                    **CORS_HEADERS,
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': True,
                    'message': 'Job creation not implemented yet'
                })
            }
        else:
            return {
                'statusCode': 405,
                'headers': {
                    **CORS_HEADERS,
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({
                    'success': False,
                    'error': 'Method not allowed'
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
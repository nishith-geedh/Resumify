# Comprehensive File Format Support

This document describes the comprehensive file format support implemented in the Resumify application.

## Supported File Formats

The application now supports the following file formats for resume processing:

### PDF Files
- **Format**: Portable Document Format (.pdf)
- **Processing**: AWS Textract for text extraction
- **Content Type**: `application/pdf`
- **Features**: 
  - High-accuracy text extraction
  - Handles complex layouts and formatting
  - Supports multi-page documents
  - Preserves text structure

### Microsoft Word Documents (DOCX)
- **Format**: Office Open XML Document (.docx)
- **Processing**: python-docx library
- **Content Type**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Features**:
  - Extracts text from paragraphs
  - Extracts text from tables
  - Handles modern Word document format
  - Preserves document structure

### Legacy Microsoft Word Documents (DOC)
- **Format**: Microsoft Word 97-2003 Document (.doc)
- **Processing**: docx2txt library with fallback
- **Content Type**: `application/msword`
- **Features**:
  - Supports legacy Word format
  - Fallback text extraction for compatibility
  - Handles older document formats

### Plain Text Files
- **Format**: Plain Text (.txt)
- **Processing**: Direct UTF-8 decoding
- **Content Type**: `text/plain`
- **Features**:
  - Simple and reliable text extraction
  - UTF-8 encoding support
  - Handles various text encodings with error tolerance

## Processing Pipeline

### Upload Handler
The upload handler (`src/upload_handler/app.py`) determines the file type and routes it to the appropriate processing pipeline:

1. **File Type Detection**: Based on file extension
2. **Content Type Assignment**: Sets appropriate MIME type
3. **Storage**: Uploads file to S3 bucket
4. **Processing Routing**:
   - PDF files → Textract processing
   - DOCX/DOC/TXT files → Direct processing via S3 events

### Text Extraction Workers

#### PDF Processing (Textract Worker)
- **Function**: `src/textract_worker/app.py`
- **Trigger**: Manual invocation after Textract job completion
- **Process**:
  1. Retrieves Textract job results
  2. Extracts text from LINE blocks
  3. Handles multi-page documents
  4. Updates analysis record with extracted text
  5. Triggers NLP analysis

#### DOCX/DOC/TXT Processing (DocxTxt Worker)
- **Function**: `src/docx_txt_worker/app.py`
- **Trigger**: S3 object creation events
- **Process**:
  1. Downloads file from S3
  2. Determines file type
  3. Applies appropriate extraction method:
     - DOCX: python-docx library
     - DOC: docx2txt library with fallback
     - TXT: UTF-8 decoding
  4. Updates analysis record with extracted text
  5. Triggers NLP analysis

### Error Handling

The system includes comprehensive error handling for file processing:

1. **Unsupported File Types**: Clear error messages for unsupported formats
2. **Extraction Failures**: Fallback methods for DOC files
3. **Encoding Issues**: Error-tolerant text decoding
4. **Processing Timeouts**: Appropriate timeout handling
5. **Status Tracking**: Detailed status updates throughout the pipeline

## S3 Bucket Configuration

The S3 bucket is configured with Lambda triggers for automatic processing:

```yaml
NotificationConfiguration:
  LambdaConfigurations:
    - Event: s3:ObjectCreated:*
      Function: DocxTxtWorkerFunction
      Filter:
        S3Key:
          Rules:
            - Name: suffix
              Value: .docx
    - Event: s3:ObjectCreated:*
      Function: DocxTxtWorkerFunction
      Filter:
        S3Key:
          Rules:
            - Name: suffix
              Value: .doc
    - Event: s3:ObjectCreated:*
      Function: DocxTxtWorkerFunction
      Filter:
        S3Key:
          Rules:
            - Name: suffix
              Value: .txt
```

## Dependencies

### Upload Handler
- `boto3`: AWS SDK for Python
- Standard library modules

### Textract Worker
- `boto3`: AWS SDK for Python
- Standard library modules

### DocxTxt Worker
- `boto3`: AWS SDK for Python
- `python-docx==0.8.11`: DOCX file processing
- `docx2txt==0.8`: DOC file processing
- Standard library modules

## Testing

The file format support includes comprehensive testing:

- **Content Type Detection**: Verifies correct MIME types
- **Text Extraction**: Tests extraction functions
- **File Routing**: Validates processing pipeline routing
- **Error Handling**: Tests fallback mechanisms

Run tests with:
```bash
python tests/test_file_format_support.py
```

## Performance Considerations

1. **PDF Processing**: Textract provides high accuracy but may have longer processing times
2. **DOCX Processing**: Fast and reliable with python-docx
3. **DOC Processing**: May require fallback methods for complex documents
4. **TXT Processing**: Fastest processing with direct text reading

## Security

- All files are stored in encrypted S3 buckets
- Processing functions have minimal required permissions
- No persistent storage of file contents in Lambda functions
- Temporary files are cleaned up after processing

## Monitoring and Logging

The system includes comprehensive logging for:
- File upload events
- Text extraction status
- Processing errors
- Performance metrics

All logs are available in CloudWatch for monitoring and debugging.

## Future Enhancements

Potential future improvements:
1. Support for additional formats (RTF, ODT)
2. Enhanced OCR capabilities for scanned documents
3. Image-based resume processing
4. Batch processing capabilities
5. Advanced document structure analysis
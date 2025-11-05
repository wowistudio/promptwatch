import Papa from "papaparse";

const MAX_CONTENT_SIZE = 1000 * 1024; // 1MB

// Expected CSV headers based on urls.csv
const EXPECTED_HEADERS = [
    "url",
    "title",
    "ai_model_mentioned",
    "citations_count",
    "sentiment",
    "visibility_score",
    "competitor_mentioned",
    "query_category",
    "last_updated",
    "traffic_estimate",
    "domain_authority",
    "mentions_count",
    "position_in_response",
    "response_type",
    "geographic_region",
] as const;

function failValidationResponse(error: string) {
    return {
        success: false,
        error: error,
    };
}


export function validateCSV(content: string) {
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

    // validate content-size
    if (parsed.meta.cursor && parsed.meta.cursor > MAX_CONTENT_SIZE)
        return failValidationResponse(`Content exceeded ${MAX_CONTENT_SIZE} bytes`);

    // validate expected headers
    const missing_headers = EXPECTED_HEADERS.filter((header) => !parsed.meta.fields?.includes(header));
    if (missing_headers.length > 0)
        return failValidationResponse(`Missing columns: ${missing_headers.join(", ")}`);

    // validate data is not empty
    if (parsed.data.length === 0)
        return failValidationResponse("CSV empty");

    // add any papaparse errors
    if (parsed.errors.length > 0)
        return failValidationResponse(parsed.errors.map((error: any) => error.message).join(", "));

    return null;
}
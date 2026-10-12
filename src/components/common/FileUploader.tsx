import { AlertCircle, Check, Edit2, FileText, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Single file mode props
interface SingleFileUploaderProps {
  multiple?: false;
  value?: File | null;
  onValueChange: (file: File | null) => void;
}

// Multiple files mode props
interface MultipleFileUploaderProps {
  multiple: true;
  value?: File[];
  onValueChange: (files: File[]) => void;
}

// Common props for both modes
interface CommonFileUploaderProps {
  label?: string;
  accept?: string;
  displayAccept?: boolean;
  maxSize?: number; // in bytes, applies to each file
  maxFiles?: number; // only used in multiple mode
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  showFileList?: boolean; // whether to show list of files in multiple mode
}

type FileUploaderProps = CommonFileUploaderProps &
  (SingleFileUploaderProps | MultipleFileUploaderProps);

interface FileListItemProps {
  file?: File;
  label?: string;
  formatFileSize: (bytes: number) => string;
  onRemove: (e: React.MouseEvent) => void;
  onRename?: (newName: string) => void;
  disabled?: boolean;
  className?: string;
  allowRename?: boolean;
}

const FileListItem = ({
  file,
  label,
  formatFileSize,
  onRemove,
  onRename,
  disabled,
  className,
  allowRename = false,
}: FileListItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file?.name || "");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      // Select filename without extension
      const nameWithoutExt = file?.name.replace(/\.[^/.]+$/, "") || "";
      renameInputRef.current.setSelectionRange(0, nameWithoutExt.length);
    }
  }, [isRenaming, file?.name]);

  const handleRename = () => {
    if (onRename && renameValue.trim()) {
      // Preserve file extension
      const extension = file?.name.match(/\.[^/.]+$/) || [""];
      const newName = renameValue.trim() + extension[0];
      onRename(newName);
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setRenameValue(file?.name || "");
      setIsRenaming(false);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between text-sm gap-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {label ? (
          <span className="text-muted-foreground">{label}</span>
        ) : isRenaming && allowRename ? (
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="truncate max-w-[200px]">{file?.name}</span>
            {file && (
              <span className="text-muted-foreground flex-shrink-0">
                ({formatFileSize(file.size)})
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {allowRename && !isRenaming && file && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
              setRenameValue(file.name);
            }}
            disabled={disabled}
            className="h-7 w-7 p-0"
            title="Rename file"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        )}
        {isRenaming && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRename();
            }}
            disabled={disabled}
            className="h-7 w-7 p-0"
            title="Confirm rename"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="h-7 w-7 p-0 relative z-20"
          title="Remove file"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} bytes`;
  else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  else if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  else return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const FileUploader = (props: FileUploaderProps) => {
  const {
    label = "Upload file",
    accept = "*",
    maxSize = 5 * 1024 * 1024, // 5MB default
    displayAccept = true,
    className,
    disabled = false,
    placeholder,
    showFileList = true,
  } = props;

  const isMultiple = props.multiple === true;
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format accept string into readable format
  const formatAcceptedTypes = (accept: string): string => {
    if (accept === "*") return "All files";

    const types = accept.split(",").map((type) => {
      const trimmed = type.trim();
      return trimmed
        .replace("image/", "")
        .replace("audio/", "")
        .replace("video/", "")
        .replace("application/", "")
        .toUpperCase();
    });
    return types.join(", ");
  };

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        return `File "${file.name}" is too large. Max size is ${formatFileSize(
          maxSize,
        )}`;
      }
      return null;
    },
    [maxSize],
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      if (isMultiple) {
        props.onValueChange([]);
      } else {
        props.onValueChange(null);
      }
      setError("");
      return;
    }

    const fileArray = Array.from(files);

    // Check max files limit for multiple mode
    if (isMultiple && props.maxFiles && fileArray.length > props.maxFiles) {
      setError(
        `Too many files. Maximum ${props.maxFiles} file${
          props.maxFiles > 1 ? "s" : ""
        } allowed.`,
      );
      return;
    }

    // Validate each file
    const errors: string[] = [];
    const validFiles: File[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors[0]); // Show first error
      return;
    }

    setError("");

    if (isMultiple) {
      // In multiple mode, merge with existing files or replace
      const existingFiles = props.value || [];
      props.onValueChange([...existingFiles, ...validFiles]);
    } else {
      // Single file mode
      props.onValueChange(validFiles[0] || null);
    }

    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Helper to create a File with a new name
  const renameFile = (file: File, newName: string): File => {
    return new File([file], newName, {
      type: file.type,
      lastModified: file.lastModified,
    });
  };

  // Handle file renaming
  const handleRename = (file: File, newName: string, index?: number) => {
    const renamedFile = renameFile(file, newName);

    if (isMultiple) {
      const files = props.value || [];
      if (index !== undefined) {
        const newFiles = [...files];
        newFiles[index] = renamedFile;
        props.onValueChange(newFiles);
      }
    } else {
      props.onValueChange(renamedFile);
    }
  };

  // Handle clipboard paste
  const handlePaste = useCallback(
    async (e: Event) => {
      const clipboardEvent = e as ClipboardEvent;
      const items = clipboardEvent.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], `pasted-image-${Date.now()}.png`, {
              type: item.type,
            });
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        clipboardEvent.preventDefault();
        // Validate and add files
        const errors: string[] = [];
        const validFiles: File[] = [];

        imageFiles.forEach((file) => {
          const error = validateFile(file);
          if (error) {
            errors.push(error);
          } else {
            validFiles.push(file);
          }
        });

        if (errors.length > 0) {
          setError(errors[0]);
          return;
        }

        setError("");

        if (isMultiple) {
          const existingFiles = props.value || [];
          // Check max files limit
          if (
            props.maxFiles &&
            existingFiles.length + validFiles.length > props.maxFiles
          ) {
            setError(
              `Too many files. Maximum ${props.maxFiles} file${
                props.maxFiles > 1 ? "s" : ""
              } allowed.`,
            );
            return;
          }
          props.onValueChange([...existingFiles, ...validFiles]);
        } else {
          props.onValueChange(validFiles[0] || null);
        }
      }
    },
    [
      isMultiple,
      props.value,
      props.maxFiles,
      props.onValueChange,
      validateFile,
    ],
  );

  // Set up paste event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pasteHandler = (e: Event) => {
      handlePaste(e);
    };

    container.addEventListener("paste", pasteHandler);
    // Make container focusable for paste events
    container.setAttribute("tabIndex", "-1");

    return () => {
      container.removeEventListener("paste", pasteHandler);
    };
  }, [handlePaste]);

  const handleRemove = (e: React.MouseEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Reset file input first
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (isMultiple) {
      const files = props.value || [];
      if (index !== undefined) {
        const newFiles = files.filter((_, i) => i !== index);
        props.onValueChange(newFiles);
      } else {
        props.onValueChange([]);
      }
    } else {
      // Explicitly pass null to ensure state update
      props.onValueChange(null);
    }
    setError("");
  };

  const acceptedTypes = formatAcceptedTypes(accept);
  const files = isMultiple
    ? props.value || []
    : props.value && props.value instanceof File
      ? [props.value]
      : [];
  const hasFiles = files.length > 0;

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    if (isMultiple) {
      return `Drop file${
        props.maxFiles && props.maxFiles > 1 ? "s" : ""
      } here or click to upload`;
    }
    return "Drop file here or click to upload";
  };

  return (
    <div className={cn("flex flex-col gap-2", className)} ref={containerRef}>
      {label && <Label>{label}</Label>}

      <div className="grid gap-2">
        <div className="relative">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={isMultiple}
            onChange={handleFileChange}
            disabled={disabled}
            className="peer opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10 disabled:cursor-not-allowed"
          />

          <div
            className={cn(
              "border rounded-md transition-colors",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
              "peer-hover:bg-muted/50",
              error ? "border-destructive" : "border-input",
              disabled && "opacity-50 cursor-not-allowed",
              hasFiles && isMultiple && showFileList
                ? "p-2"
                : "flex items-center justify-center px-3 py-2 min-h-10",
            )}
          >
            {hasFiles ? (
              isMultiple && showFileList ? (
                // Multiple files with full list display
                <div className="flex flex-col gap-2">
                  {files.map((file, index) => (
                    <FileListItem
                      // biome-ignore lint/suspicious/noArrayIndexKey: File objects have no stable id; name+index is the best available key
                      key={`${file.name}-${index}`}
                      file={file}
                      formatFileSize={formatFileSize}
                      onRemove={(e) => handleRemove(e, index)}
                      onRename={(newName) => handleRename(file, newName, index)}
                      disabled={disabled}
                      allowRename={true}
                    />
                  ))}
                </div>
              ) : (
                // Single file display or multiple files collapsed view
                <FileListItem
                  file={isMultiple ? undefined : files[0]}
                  label={
                    isMultiple
                      ? `${files.length} file${
                          files.length !== 1 ? "s" : ""
                        } selected`
                      : undefined
                  }
                  formatFileSize={formatFileSize}
                  onRemove={handleRemove}
                  onRename={
                    !isMultiple && files[0]
                      ? (newName) => handleRename(files[0], newName)
                      : undefined
                  }
                  disabled={disabled}
                  allowRename={!isMultiple}
                  className="w-full"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 w-full">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <div className="text-sm font-medium">
                  {getPlaceholderText()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Max size: {formatFileSize(maxSize)}
                  {isMultiple && props.maxFiles
                    ? ` • Max files: ${props.maxFiles}`
                    : ""}
                  {accept.includes("image") || accept === "*" ? (
                    <span> • Paste image from clipboard</span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Accepted file types - placed under the dropzone */}
        {!hasFiles && displayAccept && (
          <div className="text-xs text-muted-foreground -mt-1 ml-1">
            Accepted file types: {acceptedTypes}
          </div>
        )}

        {error && (
          <div className="flex items-center text-destructive text-sm gap-1">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

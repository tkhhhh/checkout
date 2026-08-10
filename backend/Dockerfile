# syntax=docker/dockerfile:1.7

FROM golang:1.22-alpine AS build
WORKDIR /src

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/checkout-api .

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/checkout-api /app/checkout-api

ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot

ENTRYPOINT ["/app/checkout-api"]

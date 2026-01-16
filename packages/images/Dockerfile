FROM ruby:3.2.9-alpine

RUN apk add --no-cache \
    build-base \
    yaml-dev \
    tzdata \
    wget

WORKDIR /app

COPY Gemfile Gemfile.lock ./

# Instalar bundler nuevo (tendrá precedencia sobre el default)
RUN gem install bundler -v 4.0.3 && \
    bundle _4.0.3_ config set --local without 'development test' && \
    bundle _4.0.3_ install -j4 --retry 3 && \
    apk del build-base yaml-dev

COPY . .

EXPOSE 3004

CMD ["bundle", "_4.0.3_", "exec", "puma", "-C", "config/puma.rb"]
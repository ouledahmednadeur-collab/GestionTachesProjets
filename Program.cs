using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using GestionTachesProjets.Data ;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Repositories;
using Microsoft.AspNetCore.Identity ;
using Microsoft.OpenApi;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers().AddJsonOptions(o=> o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddDbContext<AppDbContext>(options=>options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddIdentityCore<IdentityUser>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>();
builder.Services.AddScoped<IProjetRepository ,ProjetRepository>();
builder.Services.AddScoped<IMembreRepository ,MembreRepository>();
builder.Services.AddScoped<ITacheRepository ,TacheRepository>();
builder.Services.AddScoped<ICommentaireRepository ,CommentaireRepository>();
builder.Services.AddScoped<IMessageRepository ,MessageRepository>();
// hedhi seeee7bi el Injection De Dependance , wa9telli classe men les classe 
// test7a9 IProjetRepository fel constructeur mte3ha , houni na3tiwha ProjetRepository
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme ="bearer",
        BearerFormat="JWT",
        Description="Collez le token obtenu avec /api/Auth/login"
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement{
        [new OpenApiSecuritySchemeReference("Bearer",document)]=[]
         });
         });
//---------------------------------------------------------------------------------------------------
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options=>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer =true ,
        ValidateAudience =true ,
        ValidateLifetime=true,
        ValidateIssuerSigningKey=true,
        ValidIssuer=builder.Configuration["jwt:Issuer"],
        ValidAudience=builder.Configuration["Jwt:Audience"],
        IssuerSigningKey=new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});
//---------------------------------------------------------------------------------------------------------
var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    await Dbseeder.SeedAsync(scope.ServiceProvider);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();

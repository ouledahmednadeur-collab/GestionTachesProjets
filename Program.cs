using GestionTachesProjets.Data ;
using Microsoft.EntityFrameworkCore;
using GestionTachesProjets.Repositories;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddDbContext<AppDbContext>(options=>options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IProjetRepository ,ProjetRepository>();
builder.Services.AddScoped<IMembreRepository ,MembreRepository>();
builder.Services.AddScoped<ITacheRepository ,TacheRepository>();
builder.Services.AddScoped<ICommentaireRepository ,CommentaireRepository>();
// hedhi seeee7bi el Injection De Dependance , wa9telli classe men les classe 
// test7a9 IProjetRepository fel constructeur mte3ha , houni na3tiwha ProjetRepository
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
